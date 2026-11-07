#!/usr/bin/env node
// check-ui.mjs
// UI rules lint cannot express (ADR 0025): no Tailwind arbitrary value or palette color in a class we write, and no
// changed generated primitive. It does not depend on ESLint, so a weakened ESLint config does not turn it off.
//
// shadcn-primitives.lock.json classifies every file in src/shared/ui:
//   primitives  written by the shadcn CLI: its hash must match, and it is not scanned
//   own         our code, with the reason: scanned like the rest of the app (app-*.ts(x) is own with no entry)
//
// Usage (app root; needs the app's own `typescript`):
//   node scripts/check-ui.mjs                                  check
//   node scripts/check-ui.mjs --accept button.tsx              record a primitive the CLI just added
//   node scripts/check-ui.mjs --accept button.tsx --reason "x" record a change: a listed lint fix or an approved variant
//   node scripts/check-ui.mjs --own stat-card.tsx --reason "x" record a file in shared/ui as our code
//   node scripts/check-ui.mjs --forget button.tsx              drop a deleted file
//   node scripts/check-ui.mjs --baseline                       first install only: record what shared/ui holds now
// Exit codes: 0 pass, 1 findings, 2 could not run or bad usage.
import { createHash } from "node:crypto"
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, relative } from "node:path"
import { pathToFileURL } from "node:url"

const ROOT = process.cwd()
const UI_DIR = "src/shared/ui"
const LOCK = "shadcn-primitives.lock.json"
const CODE_FILE = /\.[cm]?tsx?$/
const TEST_FILE = /(?:^|\/)__tests__\/|\.test\.tsx?$/
const OWN_BY_NAME = /^app-[^/]+\.tsx?$/
// Code that renders nothing: a class here would have no effect, and its strings are not classes.
const NOT_UI =
  /^src\/routeTree\.gen\.ts$|\.d\.ts$|\.server\.tsx?$|^src\/routes\/api\/|^src\/features\/[^/]+\/server\/|^src\/shared\/server\//

const rel = (p) => relative(ROOT, p).split("\\").join("/")
const hash = (path) =>
  createHash("sha256")
    .update(readFileSync(path, "utf8").replaceAll("\r\n", "\n"))
    .digest("hex")

// Each check script is installed into the app as a single file with no shared module, so it has its own walk()
// (ADR 0034). The installer's copy is installer/files.mjs, listFiles().
function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (CODE_FILE.test(entry.name)) out.push(full)
  }
  return out
}

/** The last part of a class, after its variants. A `:` inside `[...]` or `(...)` does not split. */
function utilityOf(token) {
  let depth = 0
  let start = 0
  for (let i = 0; i < token.length; i++) {
    const c = token[i]
    if (c === "[" || c === "(") depth++
    else if (c === "]" || c === ")") depth--
    else if (c === ":" && depth === 0) start = i + 1
  }
  return token.slice(start)
}

/** True for `w-[350px]`, `bg-[#fff]/50`, `bg-card/[0.5]`, `[mask-type:luminance]`. Variants alone are not values. */
export function isArbitraryClass(token) {
  const utility = utilityOf(token)
  if (/^(?:group-|peer-)?(?:data|aria)-\[/.test(utility)) return false
  return (
    /^!?-?[a-z][\w-]*-\[[^\]]+\](?:\/[\w.%[\]-]+)?!?$/.test(utility) ||
    /^!?-?[a-z][\w-]*\/\[[^\]]+\]!?$/.test(utility) ||
    /^!?\[[a-z-]+:[^\]]+\]!?$/.test(utility)
  )
}

/** Tailwind's default palette (read from tailwindcss 4.3.3, theme.css). A theme color with its own name stays allowed. */
const PALETTE_CLASS =
  /^!?(?:bg|text|decoration|border(?:-[xytrblse])?|divide|outline|ring|ring-offset|inset-ring|shadow|inset-shadow|text-shadow|drop-shadow|accent|caret|fill|stroke|from|via|to|placeholder|scrollbar-thumb|scrollbar-track)-(?:(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|mauve|olive|mist|taupe)-(?:50|[1-9]00|950)|black|white)(?:\/\S+)?!?$/

/** True for `text-gray-500`, `dark:bg-white`, `border-t-red-500/50`. Semantic tokens such as `bg-card` are not. */
export function isPaletteClass(token) {
  return PALETTE_CLASS.test(utilityOf(token))
}

/** @returns {{line: number, token: string, problem: string}[]} */
export function scanSource(ts, fileName, text) {
  const source = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  )
  const out = []
  const check = (node, value) => {
    for (const token of value.split(/\s+/)) {
      const problem = isArbitraryClass(token)
        ? "arbitrary value"
        : isPaletteClass(token)
          ? "palette color"
          : null
      if (problem) {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart())
        out.push({ line: line + 1, token, problem })
      }
    }
  }
  const visit = (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      check(node, node.text)
    } else if (ts.isTemplateExpression(node)) {
      // A placeholder for each `${}`, so `w-[${n}px]` reads as one class.
      const spans = node.templateSpans.map((span) => span.literal.text)
      check(node, [node.head.text, ...spans].join("X"))
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return out
}

function readLock() {
  const path = join(ROOT, LOCK)
  if (!existsSync(path)) return { primitives: {}, own: {} }
  const lock = JSON.parse(readFileSync(path, "utf8"))
  return { primitives: lock.primitives ?? {}, own: lock.own ?? {} }
}

function writeLock(lock) {
  const sorted = (entries) =>
    Object.fromEntries(
      Object.entries(entries).sort(([a], [b]) => a.localeCompare(b))
    )
  writeFileSync(
    join(ROOT, LOCK),
    `${JSON.stringify({ primitives: sorted(lock.primitives), own: sorted(lock.own) }, null, 2)}\n`
  )
}

const uiFiles = () =>
  walk(join(ROOT, UI_DIR))
    .map((p) => relative(join(ROOT, UI_DIR), p).split("\\").join("/"))
    .filter((f) => !TEST_FILE.test(f))

function usage(message) {
  console.error(`check-ui: ${message}`)
  process.exit(2)
}

function update(args) {
  const lock = readLock()
  const reasonAt = args.indexOf("--reason")
  const reason = reasonAt >= 0 ? args[reasonAt + 1] : undefined
  if (reasonAt >= 0 && !reason) usage("--reason needs a text")
  const names = args.filter(
    (a, i) => !a.startsWith("--") && (reasonAt < 0 || i !== reasonAt + 1)
  )

  if (args[0] === "--baseline") {
    if (existsSync(join(ROOT, LOCK))) usage(`${LOCK} already exists`)
    for (const name of uiFiles()) {
      if (!OWN_BY_NAME.test(name))
        lock.primitives[name] = { sha256: hash(join(ROOT, UI_DIR, name)) }
    }
    writeLock(lock)
    return
  }
  if (names.length === 0) usage(`${args[0]} needs a file name in ${UI_DIR}`)
  for (const name of names) {
    const path = join(ROOT, UI_DIR, name)
    if (args[0] === "--forget") {
      if (existsSync(path)) usage(`${name} still exists: delete it first`)
      delete lock.primitives[name]
      delete lock.own[name]
      continue
    }
    if (!existsSync(path)) usage(`${UI_DIR}/${name} does not exist`)
    if (args[0] === "--own") {
      if (name in lock.primitives)
        usage(
          `${name} is a primitive: it cannot become our code to allow an edit`
        )
      if (!reason) usage("--own needs --reason")
      lock.own[name] = reason
    } else {
      const known = lock.primitives[name]
      if (known && known.sha256 !== hash(path) && !reason)
        usage(
          `${name} changed: --accept needs --reason, and the change must be a listed lint fix or an approved variant (docs/04-stack/tailwind-shadcn.md)`
        )
      delete lock.own[name]
      lock.primitives[name] = {
        sha256: hash(path),
        ...((reason ?? known?.reason)
          ? { reason: reason ?? known.reason }
          : {}),
      }
    }
  }
  writeLock(lock)
}

async function check() {
  const lock = readLock()
  const problems = []
  const files = new Set(uiFiles())

  for (const [name, entry] of Object.entries(lock.primitives)) {
    if (!files.has(name))
      problems.push(
        `${UI_DIR}/${name}: in ${LOCK} but missing. Deleted on purpose: --forget ${name}`
      )
    else if (entry.sha256 !== hash(join(ROOT, UI_DIR, name)))
      problems.push(
        `${UI_DIR}/${name}: a generated primitive changed. Use its props or variants, or wrap it in a separate file (docs/04-stack/tailwind-shadcn.md, "Changing a primitive"). Restore the file; do not record the change to pass this check`
      )
  }
  for (const name of files) {
    if (
      !(name in lock.primitives) &&
      !(name in lock.own) &&
      !OWN_BY_NAME.test(name)
    )
      problems.push(
        `${UI_DIR}/${name}: not classified. Added by the CLI: --accept ${name}. Written by us: --own ${name} --reason "..."`
      )
  }

  const { default: ts } = await import("typescript")
  const primitives = new Set(
    Object.keys(lock.primitives).map((name) => `${UI_DIR}/${name}`)
  )
  const scanned = walk(join(ROOT, "src"))
    .map(rel)
    .filter((f) => !NOT_UI.test(f) && !TEST_FILE.test(f) && !primitives.has(f))
  for (const file of scanned) {
    for (const { line, token, problem } of scanSource(
      ts,
      file,
      readFileSync(join(ROOT, file), "utf8")
    ))
      problems.push(
        `${file}:${line}: ${problem} ${token}. Use a semantic theme token or a value from the scale; a new color or size goes in the CSS entry file (docs/04-stack/tailwind-shadcn.md, rule 4)`
      )
  }

  if (problems.length === 0) {
    console.log(
      `check-ui: ok (${files.size} in ${UI_DIR}, ${scanned.length} files scanned)`
    )
    return
  }
  for (const p of problems) console.error(p)
  console.error(
    `\ncheck-ui: ${problems.length} problem(s). Fix the cause; do not edit this script.`
  )
  process.exit(1)
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) return check()
  if (["--accept", "--own", "--forget", "--baseline"].includes(args[0]))
    return update(args)
  usage(`unknown option ${args[0]}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((err) => {
    console.error(
      `check-ui: could not run (${err instanceof Error ? err.message : String(err)})`
    )
    process.exit(2)
  })
