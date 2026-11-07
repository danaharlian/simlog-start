#!/usr/bin/env node
// no-suppress.hook.mjs  → install as `.claude/hooks/no-suppress.mjs` in the app repo.
// Claude Code PostToolUse hook for Edit|Write: after each edit, scan the edited file for suppression comments.
// On a finding it exits 2, so Claude sees the message on stderr right away and fixes the cause in the same turn.
// It cannot undo the edit (the tool already ran); check-suppressions.mjs and ESLint in CI remain the real gates.
//
// Reads from stdin only `tool_input.file_path` (confirmed in the Claude Code hooks docs). Other fields are not used.
// Wire-up: docs/examples/claude-settings.hooks.json. Only Claude Code runs it; other agents rely on lint + CI.
import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, join, relative } from 'node:path'
import { isScannable, scanText } from '../../scripts/check-suppressions.mjs'

async function readStdin() {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

try {
  const input = JSON.parse(await readStdin())
  const filePath = input?.tool_input?.file_path
  if (typeof filePath !== 'string') process.exit(0) // not a file edit

  const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd()
  const abs = isAbsolute(filePath) ? filePath : join(root, filePath)
  const rel = relative(root, abs).split('\\').join('/')
  if (rel.startsWith('..') || !isScannable(rel) || !existsSync(abs))
    process.exit(0)

  const findings = scanText(readFileSync(abs, 'utf8'))
  if (findings.length === 0) process.exit(0)

  const lines = findings.map((f) => `  ${rel}:${f.line} [${f.rule}] ${f.text}`)
  console.error(
    [
      `Blocked: ${findings.length} suppression(s) in ${rel}`,
      ...lines,
      'Remove them and fix the cause: read the library docs for the installed version, narrow types, or validate with Zod.',
      'If the cause is a library bug you cannot fix, stop and ask the user. Do not add suppressions, casts, or config changes to get past this.',
    ].join('\n'),
  )
  process.exit(2)
} catch (err) {
  console.error(
    `no-suppress hook failed to run: ${err instanceof Error ? err.message : String(err)}`,
  )
  process.exit(1) // non-blocking error, visible in the transcript
}
