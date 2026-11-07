#!/usr/bin/env node
// protect-ui-lock.hook.mjs  → install as `.claude/hooks/protect-ui-lock.mjs` in the app repo.
// Claude Code PreToolUse hook for Bash|Edit|Write: stops an agent from recording a changed primitive to get past
// check:ui (ADR 0026). Recording a new primitive with --accept, and our own file with --own, stay allowed.
// A person in a terminal is not affected. This is a guard rail, not a boundary: a command written another way can
// get past it. The lock's diff and CODEOWNERS remain the real check.
//
// Reads from stdin only `tool_name` and `tool_input` (`command`, `file_path`; hooks page of the Claude Code docs).
// Exit 2 blocks the call and shows stderr to the agent. Exit 1 is a non-blocking error.
// Wire-up: docs/examples/claude-settings.hooks.json. Only Claude Code runs it; other agents rely on the lock's review.
import { pathToFileURL } from 'node:url'

const LOCK = 'shadcn-primitives.lock.json'
const CHECK_UI = /check-ui(?:\.mjs)?|check:ui/
const WRITES =
  /(?:^|[\s;&|(])(?:rm|mv|cp|sed|tee|perl|awk|truncate|dd|node|python3?)\s|>/

/** @returns {string | null} why the call is blocked */
export function reasonToBlock(toolName, toolInput) {
  if (toolName === 'Edit' || toolName === 'Write') {
    const path = String(toolInput?.file_path ?? '')
    return path.split(/[\\/]/).pop() === LOCK
      ? `${LOCK} is written only by scripts/check-ui.mjs.`
      : null
  }
  if (toolName !== 'Bash') return null
  const command = String(toolInput?.command ?? '')
  if (CHECK_UI.test(command)) {
    if (/--accept\b/.test(command) && /--reason\b/.test(command))
      return 'Recording a change to a primitive is a decision for a person.'
    if (/--forget\b|--baseline\b/.test(command))
      return 'Removing a primitive from the lock, or rebuilding the lock, is a decision for a person.'
  }
  if (command.includes(LOCK) && WRITES.test(command))
    return `${LOCK} is written only by scripts/check-ui.mjs.`
  return null
}

async function main() {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  const input = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  const reason = reasonToBlock(input?.tool_name, input?.tool_input)
  if (!reason) return
  console.error(
    [
      `Blocked: ${reason}`,
      'Restore the primitive and use its props and variants, or wrap it in a separate file (docs/04-stack/tailwind-shadcn.md, "Changing a primitive").',
      'If the change is a listed lint fix or an approved variant, stop and ask the user to run the command in their own terminal.',
    ].join('\n'),
  )
  process.exit(2)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((err) => {
    console.error(
      `protect-ui-lock hook failed to run: ${err instanceof Error ? err.message : String(err)}`,
    )
    process.exit(1) // non-blocking error, visible in the transcript
  })
