#!/usr/bin/env node
// format-and-lint.hook.mjs  → install as `.claude/hooks/format-and-lint.mjs` in the app repo.
// Claude Code PostToolUse hook for Edit|Write: formats the edited file with Prettier, then lints it with ESLint and
// applies its automatic fixes. Errors that remain exit 2, so Claude sees them on stderr and fixes the cause in the same
// turn instead of at `pnpm lint` or in CI (ADR 0036). It cannot undo the edit; `check`, `lint`, and CI remain the gates.
//
// Reads from stdin only `tool_input.file_path` (always absolute; hooks page of the Claude Code docs). It runs the app's
// own Prettier and ESLint through pnpm in the project root, so `.prettierignore` and the ESLint ignores decide what is
// skipped (docs/, .claude/, src/routeTree.gen.ts), the same as `pnpm check` and `pnpm lint`.
// No `--fix` in src/shared/ui/: an automatic fix would change a generated primitive, which only a person records
// (docs/04-stack/tailwind-shadcn.md, "Changing a primitive"). The file there is still formatted and its errors reported.
// Exit 2 shows stderr to Claude. Exit 1 is a non-blocking error (a tool that could not run), shown to the user.
// Wire-up: docs/examples/claude-settings.hooks.json. Only Claude Code runs it; other agents rely on lint + CI.
import { spawnSync } from 'node:child_process'
import { existsSync, realpathSync } from 'node:fs'
import { isAbsolute, join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

const LINTED = /\.(?:[cm]?[jt]s|[jt]sx)$/
const PRIMITIVES = 'src/shared/ui/'
const ESLINT_PROBLEMS = 1 // ESLint: 0 clean, 1 problems found, 2 config or crash

/** @returns {{ lint: boolean, fix: boolean } | null} what to run on a path relative to the project root; null skips it */
export function planFor(rel) {
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) return null
  if (rel.split('/').includes('node_modules')) return null
  const lint = LINTED.test(rel)
  return { lint, fix: lint && !rel.startsWith(PRIMITIVES) }
}

function pnpmExec(root, args) {
  const r = spawnSync('pnpm', ['exec', ...args], {
    cwd: root,
    encoding: 'utf8',
  })
  if (r.error) throw r.error // pnpm itself did not start
  return r
}

/** @returns {Array<string>} what Claude has to fix; empty when the file is clean */
function formatAndLint(root, rel, { lint, fix }) {
  const problems = []
  const prettier = pnpmExec(root, [
    'prettier',
    '--write',
    '--log-level',
    'warn',
    '--ignore-unknown',
    rel,
  ])
  if (prettier.status !== 0)
    problems.push(
      `Prettier could not format ${rel}:`,
      (prettier.stderr || prettier.stdout).trim(),
    )
  if (!lint) return problems
  const eslintArgs = [
    'eslint',
    ...(fix ? ['--fix'] : []),
    '--max-warnings',
    '0',
    '--no-warn-ignored',
    rel,
  ]
  const eslint = pnpmExec(root, eslintArgs)
  if (eslint.status === ESLINT_PROBLEMS)
    problems.push(`ESLint found problems in ${rel}:`, eslint.stdout.trim())
  else if (eslint.status !== 0)
    throw new Error(
      `ESLint could not run (exit ${eslint.status}): ${eslint.stderr.trim()}`,
    )
  return problems
}

async function main() {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  const filePath = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    ?.tool_input?.file_path
  if (typeof filePath !== 'string') return // not a file edit

  const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd()
  const abs = isAbsolute(filePath) ? filePath : join(root, filePath)
  if (!existsSync(abs)) return
  // Real paths: typescript-eslint finds tsconfig.json only under the real project root, and a path through a link
  // (macOS: /var is a link to /private/var) is not under it. The tools get the path relative to the real root.
  const realRoot = realpathSync(root)
  const rel = relative(realRoot, realpathSync(abs)).split('\\').join('/')
  const plan = planFor(rel)
  if (!plan) return

  const problems = formatAndLint(realRoot, rel, plan)
  if (problems.length === 0) return
  console.error(
    [
      ...problems,
      'Fix the cause before you continue. Read the rule and the library docs for the installed version.',
      'Do not add a suppression, a cast, or a lint or TypeScript config change to get past this (docs/03-standards/no-suppression.md).',
      'If you cannot fix it, stop and ask the user.',
    ].join('\n'),
  )
  process.exit(2)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((err) => {
    console.error(
      `format-and-lint hook failed to run: ${err instanceof Error ? err.message : String(err)}`,
    )
    process.exit(1) // non-blocking error, visible in the transcript
  })
