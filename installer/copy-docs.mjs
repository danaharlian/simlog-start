// Stage 1: the docs, skills, agent files, the installer itself, and the MCP servers.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { ctx, log, SRC } from './context.mjs'
import { readJson, writeJsonLike } from './files.mjs'
import { copyTree, INSTALLER_FILES, place, placeText } from './manifest.mjs'

export function copyDocs() {
  copyTree('docs', 'docs')
  copyTree('.claude/skills', '.claude/skills')
  place('AGENTS.md', 'AGENTS.md')
  place('CLAUDE.md', 'CLAUDE.md')
  // The installer itself, so `bash install.sh` works from the app root later (--verify, or after shadcn is set up).
  if (!ctx.inPlace) for (const rel of INSTALLER_FILES) place(rel, rel)
  place('scripts/check-docs.mjs', 'scripts/check-docs.mjs')
  mergeMcp()
}

function mergeMcp() {
  // Claude Code and VS Code both read `mcpServers` from .mcp.json (ADR 0028).
  const rel = '.mcp.json'
  const src = readJson(join(SRC, rel))
  const abs = join(ctx.target, rel)
  if (!existsSync(abs)) {
    placeText(rel, readFileSync(join(SRC, rel), 'utf8'))
    return
  }
  const original = readFileSync(abs, 'utf8')
  const current = JSON.parse(original)
  current.mcpServers ??= {}
  let added = 0
  for (const [name, def] of Object.entries(src.mcpServers)) {
    if (!(name in current.mcpServers)) {
      current.mcpServers[name] = def
      added++
    }
  }
  if (added === 0) {
    log('unchanged', rel, 'MCP servers already configured')
    return
  }
  writeJsonLike(rel, original, current)
  log('updated', rel, `added ${added} MCP server(s), yours kept`)
}
