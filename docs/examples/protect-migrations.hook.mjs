#!/usr/bin/env node
// protect-migrations.hook.mjs  → install as `.claude/hooks/protect-migrations.mjs` in the app repo.
// Claude Code PreToolUse hook for Bash and the drizzle MCP server: stops an agent from changing a live database with
// no reviewed migration, and from deleting migrations (ADR 0029). `generate`, `check`, `export`, `up`, `pull`, and a
// dry run with `--explain` stay allowed. A person in a terminal is not affected. This is a guard rail, not a boundary:
// a command written another way can get past it. Credentials the agent cannot reach remain the real check.
//
// Reads from stdin only `tool_name` and `tool_input` (hooks page of the Claude Code docs).
// Exit 2 blocks the call and shows stderr to the agent. Exit 1 is a non-blocking error.
// Wire-up: docs/examples/claude-settings.hooks.json. Only Claude Code runs it.
import { pathToFileURL } from 'node:url'

const PUSH = '`push` changes a live database with no migration to review.'
const FIX_CONFLICTS =
  '`fix_conflicts` deletes migrations, and every database that ran them must be reset.'
const PULL_INIT =
  '`pull` with `init` writes to the migrations table of a live database.'

function reasonForCommand(command) {
  // Text in quotes is an argument, such as a commit message or a search pattern, not a command.
  const bare = command.replace(/'[^']*'|"[^"]*"/g, "''")
  for (const part of bare.split(/[;&|\n]/)) {
    const kit = /\bdrizzle-kit\s+(\S+)(.*)/.exec(part)
    if (!kit) continue
    const [, verb, flags] = kit
    if (/\s--explain\b/.test(flags)) continue
    if (verb === 'push') return PUSH
    if (verb === 'generate' && /\s--fix-conflicts\b/.test(flags))
      return FIX_CONFLICTS
    if (verb === 'pull' && /\s--init\b/.test(flags)) return PULL_INIT
  }
  return null
}

/** @returns {string | null} why the call is blocked */
export function reasonToBlock(toolName, toolInput) {
  if (toolName === 'Bash')
    return reasonForCommand(String(toolInput?.command ?? ''))
  if (toolName === 'mcp__drizzle__push') return PUSH
  if (toolName === 'mcp__drizzle__fix_conflicts') return FIX_CONFLICTS
  if (toolName === 'mcp__drizzle__pull' && toolInput?.init === true)
    return PULL_INIT
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
      'Use `generate`, read the SQL, and apply it with `pnpm db:migrate` (docs/03-standards/database.md).',
      'If this really is needed, stop and ask the user to run the command in their own terminal (docs/05-agent-tooling/mcp.md, "Drizzle MCP protocol").',
    ].join('\n'),
  )
  process.exit(2)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((err) => {
    console.error(
      `protect-migrations hook failed to run: ${err instanceof Error ? err.message : String(err)}`,
    )
    process.exit(1) // non-blocking error, visible in the transcript
  })
