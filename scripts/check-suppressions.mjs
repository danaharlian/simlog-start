#!/usr/bin/env node
// check-suppressions.mjs
// Text-level backstop for suppression comments. It does NOT depend on ESLint, so it still fails if an agent
// weakened the ESLint config. It only looks for directive-style comments (near zero false positives);
// `any`, `!`, `as unknown as` are caught by ESLint (eslint.no-suppress.js), not here.
//
// Usage (from the app root, needs git):
//   node scripts/check-suppressions.mjs                      scan every tracked + untracked code file
//   node scripts/check-suppressions.mjs --diff origin/main...HEAD   only lines added in that range (+ untracked files)
// In CI the --diff form needs full history (fetch-depth: 0 on GitHub Actions) so the base ref exists.
//
// Exit codes: 0 clean, 1 findings, 2 could not run.
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

const CODE_FILE = /\.(?:[cm]?[jt]s|[jt]sx)$/

// Generated files and the gate files themselves (they must mention the patterns). The gate files are
// protected by CODEOWNERS instead. Keep this list short; every entry is a hole.
export const EXCLUDED = [
  /(?:^|\/)node_modules\//,
  /(?:^|\/)(?:dist|\.output|\.tanstack|\.vinxi|coverage)\//,
  /^src\/routeTree\.gen\.ts$/,
  /^docs\//, // this documentation tree (examples quote the patterns); application code never lives here
  /^scripts\/check-suppressions\.mjs$/,
  /^scripts\/check-lint-integrity\.mjs$/,
  /^eslint\.no-suppress\.js$/,
  /^\.claude\/hooks\/no-suppress\.mjs$/,
]

// Each pattern needs the comment opener right before the directive, so prose and strings rarely match.
export const PATTERNS = [
  {
    id: "eslint-directive",
    re: /(?:\/\/|\/\*+)\s*eslint-(?:disable|enable)(?:-next-line|-line)?(?![\w-])|\/\*+\s*eslint(?:-env)?\s+[@\w/-]+\s*:|\/\*+\s*eslint-env\s/,
    message:
      "ESLint directive comment. Fix the cause. Exceptions are config overrides by path (needs an ADR).",
  },
  {
    id: "ts-directive",
    re: /(?:\/\/|\/\*+|^\s*\*)\s*@ts-(?:ignore|nocheck|expect-error)(?![\w-])/,
    message:
      "TypeScript suppression directive. Fix the type error, or validate the data with Zod.",
  },
  {
    id: "coverage-ignore",
    re: /(?:\/\/|\/\*+)\s*(?:istanbul|c8|v8)\s+ignore(?![\w-])/,
    message: "Coverage ignore comment. Write the test instead.",
  },
  {
    id: "test-skip",
    re: /\b(?:it|test|describe|suite)\.(?:only|skip)\s*\(|\bx(?:it|test|describe)\s*\(/,
    message:
      "Skipped or focused test. Fix or delete the test; never commit `.only` or `.skip`.",
  },
]

export function isScannable(path) {
  return CODE_FILE.test(path) && !EXCLUDED.some((re) => re.test(path))
}

/** @returns {{rule: string, line: number, text: string, message: string}[]} */
export function scanText(text) {
  const out = []
  const lines = text.split("\n")
  for (let i = 0; i < lines.length; i++) {
    for (const p of PATTERNS) {
      if (p.re.test(lines[i]))
        out.push({
          rule: p.id,
          line: i + 1,
          text: lines[i].trim(),
          message: p.message,
        })
    }
  }
  return out
}

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  })
}

/** Added lines per file from `git diff --unified=0`. */
function addedLines(range) {
  const diff = git([
    "diff",
    "--unified=0",
    "--no-color",
    "--no-ext-diff",
    range,
    "--",
  ])
  const result = new Map()
  let file = null
  let lineNo = 0
  for (const raw of diff.split("\n")) {
    if (raw.startsWith("+++ ")) {
      file = raw === "+++ /dev/null" ? null : raw.slice(6) // strip "+++ b/"
    } else if (raw.startsWith("@@")) {
      const m = /\+(\d+)(?:,(\d+))?/.exec(raw)
      lineNo = m ? Number(m[1]) : 0
    } else if (file && raw.startsWith("+") && !raw.startsWith("+++")) {
      if (!result.has(file)) result.set(file, [])
      result.get(file).push({ line: lineNo, text: raw.slice(1) })
      lineNo++
    }
  }
  return result
}

function main() {
  const args = process.argv.slice(2)
  const diffIdx = args.indexOf("--diff")
  const range = diffIdx >= 0 ? args[diffIdx + 1] : null
  if (diffIdx >= 0 && !range) {
    console.error(
      "check-suppressions: --diff needs a ref range, e.g. origin/main...HEAD"
    )
    process.exit(2)
  }

  const findings = []
  try {
    const untracked = git(["ls-files", "--others", "--exclude-standard"])
      .split("\n")
      .filter(Boolean)
    const tracked = range
      ? []
      : git(["ls-files", "--cached"]).split("\n").filter(Boolean)
    for (const file of new Set([...tracked, ...untracked])) {
      if (!isScannable(file)) continue
      let text
      try {
        text = readFileSync(file, "utf8")
      } catch {
        continue // deleted in the working tree
      }
      for (const f of scanText(text)) findings.push({ file, ...f })
    }
    if (range) {
      for (const [file, added] of addedLines(range)) {
        if (!isScannable(file)) continue
        for (const { line, text } of added) {
          for (const f of scanText(text)) findings.push({ file, ...f, line })
        }
      }
    }
  } catch (err) {
    console.error(
      `check-suppressions: could not run git (${err instanceof Error ? err.message : String(err)})`
    )
    process.exit(2)
  }

  if (findings.length === 0) {
    console.log(
      `check-suppressions: clean (${range ? `added lines in ${range}` : "whole tree"})`
    )
    return
  }
  for (const f of findings)
    console.error(
      `${f.file}:${f.line}: [${f.rule}] ${f.message}\n    ${f.text}`
    )
  console.error(
    `\ncheck-suppressions: ${findings.length} finding(s). Fix the cause; do not rewrite the comment to dodge this check.`
  )
  process.exit(1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main()
