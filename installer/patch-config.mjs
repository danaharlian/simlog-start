// Stage 3: patches to the app's own config files. Each patch changes only what the docs need and reports the rest.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { ctx, log, run } from './context.mjs'
import { write, writeJsonLike } from './files.mjs'
import { matchBracket, parseJsonc } from './jsonc.mjs'

export const TS_FLAGS = ['strict', 'noUncheckedIndexedAccess', 'noImplicitOverride', 'noFallthroughCasesInSwitch', 'verbatimModuleSyntax', 'isolatedModules']
const SCRIPTS = {
  typecheck: 'tsc --noEmit',
  test: 'vitest run --passWithNoTests',
  'check:suppressions': 'node scripts/check-suppressions.mjs',
  'check:gates': 'node scripts/check-lint-integrity.mjs',
  'check:ui': 'node scripts/check-ui.mjs',
  'check:docs': 'node scripts/check-docs.mjs',
}
const LINT_SCRIPT = 'eslint . --max-warnings 0'
const PRETTIER_IGNORE_MARKER = '# ai-coding-docs'
const PRETTIER_IGNORE = ['docs/', '.claude/', '.github/', '.mcp.json', 'specs/', 'AGENTS.md', 'CLAUDE.md', 'install.mjs', 'install.sh', 'installer/', 'src/routeTree.gen.ts']

export function patchPackageJson() {
  const rel = 'package.json'
  const original = readFileSync(join(ctx.target, rel), 'utf8')
  const next = JSON.parse(original)
  const notes = []
  next.scripts ??= {}
  const lint = next.scripts.lint
  if (typeof lint !== 'string') {
    next.scripts.lint = LINT_SCRIPT
    notes.push('lint')
  } else if (!/--max-warnings(?:\s+|=)0\b/.test(lint)) {
    next.scripts.lint = `${lint.trim() === 'eslint' ? 'eslint .' : lint.trim()} --max-warnings 0`
    notes.push('lint --max-warnings 0')
  }
  for (const [name, cmd] of Object.entries(SCRIPTS)) {
    if (!(name in next.scripts)) {
      next.scripts[name] = cmd
      notes.push(name)
    } else if (next.scripts[name] !== cmd && name.startsWith('check:')) {
      ctx.manual.push(`package.json script "${name}" already exists with another command (${next.scripts[name]}); the docs expect "${cmd}".`)
    }
  }
  const ts = next.devDependencies?.typescript
  if (typeof ts === 'string' && /^\^6\./.test(ts)) {
    next.devDependencies.typescript = ts.replace('^', '~')
    notes.push(`typescript ${ts} -> ~ (typescript-eslint 8.72 needs TypeScript < 6.1)`)
  }
  const changed = writeJsonLike(rel, original, next)
  log(changed ? 'updated' : 'unchanged', rel, notes.join(', ') || 'scripts already set')
}

export function patchTsconfig() {
  const rel = 'tsconfig.json'
  const abs = join(ctx.target, rel)
  if (!existsSync(abs)) return ctx.manual.push('tsconfig.json not found: add the flags listed in docs/03-standards/typescript.md yourself.')
  let text = readFileSync(abs, 'utf8')
  let parsed
  try {
    parsed = parseJsonc(text)
  } catch {
    return ctx.manual.push('tsconfig.json could not be read: add these compilerOptions yourself: ' + TS_FLAGS.join(', '))
  }
  const options = parsed.compilerOptions
  if (!options) {
    return ctx.manual.push('tsconfig.json has no compilerOptions (it may extend another file): make sure these are true: ' + TS_FLAGS.join(', '))
  }
  const added = []
  for (const flag of TS_FLAGS.filter((f) => options[f] !== true)) {
    const next = setFlag(text, flag, flag in options)
    if (next === null) return ctx.manual.push('tsconfig.json: add these compilerOptions by hand: ' + TS_FLAGS.join(', '))
    if (next === text) {
      ctx.manual.push(`tsconfig.json: set "${flag}": true by hand.`)
      continue
    }
    text = next
    added.push(flag)
  }
  if (added.length === 0) return log('unchanged', rel, 'strict flags already set')
  if (!ctx.args.dryRun) write(rel, text)
  log('updated', rel, 'set ' + added.join(', '))
}

/** `text` with `"flag": true`: flips a `false`, or inserts it first in compilerOptions. Null when there is no such block. */
function setFlag(text, flag, present) {
  if (present) {
    const re = new RegExp(`("${flag}"\\s*:\\s*)false`)
    return re.test(text) ? text.replace(re, '$1true') : text
  }
  const open = /"compilerOptions"\s*:\s*\{/.exec(text)
  if (!open) return null
  const head = open.index + open[0].length
  const after = text.slice(head)
  const indent = /\n([ \t]+)\S/.exec(after)?.[1] ?? '    '
  const empty = /^\s*\}/.test(after)
  return text.slice(0, head) + `\n${indent}"${flag}": true${empty ? '\n' : ','}` + after
}

export function patchEslintConfig() {
  const found = ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.ts'].find((c) => existsSync(join(ctx.target, c)))
  const lines = [
    "add `import { aiDocsConfig } from './eslint.ai-docs.js'`",
    'add `...aiDocsConfig` as the LAST item of the exported config array',
  ]
  if (!found) return ctx.manual.push(`No eslint.config.js found. Create one: ${lines[0]}, and ${lines[1]}.`)
  const text = readFileSync(join(ctx.target, found), 'utf8')
  if (text.includes('eslint.ai-docs.js')) return log('unchanged', found, 'already wired')
  const exp = /export\s+default\s+(?:[\w.]+\(\s*)?\[/.exec(text)
  if (!exp) return ctx.manual.push(`${found}: could not find \`export default [ ... ]\`. ${lines[0]}, then ${lines[1]}.`)
  const match = matchBracket(text, exp.index + exp[0].length - 1)
  if (!match) return ctx.manual.push(`${found}: could not read the exported array. ${lines[0]}, then ${lines[1]}`)
  const needsComma = text[match.lastCode] !== ',' && text[match.lastCode] !== '['
  const head = text.slice(0, match.lastCode + 1) + (needsComma ? ',' : '')
  const next = head + text.slice(match.lastCode + 1, match.close).replace(/\s*$/, '') + '\n  ...aiDocsConfig,\n' + text.slice(match.close)
  if (!ctx.args.dryRun) write(found, addImportLine(next))
  log('updated', found, 'imports aiDocsConfig and spreads it last')
}

/** Adds the aiDocsConfig import after the last import, in the file's own quote and semicolon style. */
function addImportLine(text) {
  const last = [...text.matchAll(/^import[\s\S]*?from\s+(['"])[^'"]+\1(;?)[ \t]*$/gm)].at(-1)
  const q = last ? last[1] : "'"
  const semi = last ? last[2] : ''
  const importLine = `import { aiDocsConfig } from ${q}./eslint.ai-docs.js${q}${semi}`
  if (!last) return importLine + '\n' + text
  const end = last.index + last[0].length
  return text.slice(0, end) + '\n' + importLine + text.slice(end)
}

export function patchPrettierIgnore() {
  const rel = '.prettierignore'
  const abs = join(ctx.target, rel)
  const current = existsSync(abs) ? readFileSync(abs, 'utf8') : ''
  const separator = current && !current.endsWith('\n') ? '\n' : ''
  if (current.includes(PRETTIER_IGNORE_MARKER)) {
    // An earlier install has the block: add only the entries it does not have yet.
    const present = new Set(current.split('\n').map((line) => line.trim()))
    const missing = PRETTIER_IGNORE.filter((entry) => !present.has(entry))
    if (missing.length === 0) return log('unchanged', rel, 'already has the block')
    if (!ctx.args.dryRun) write(rel, `${current}${separator}${missing.join('\n')}\n`)
    return log('updated', rel, `also ignores ${missing.join(', ')}`)
  }
  const block = `${separator}${PRETTIER_IGNORE_MARKER}: docs, agent files, tooling, and generated files are not formatted by the app\n${PRETTIER_IGNORE.join('\n')}\n`
  if (!ctx.args.dryRun) write(rel, current + block)
  log(current ? 'updated' : 'created', rel, 'ignores docs/, .claude/, AGENTS.md, CLAUDE.md, src/routeTree.gen.ts')
}

/** First install: records what shared/ui holds now, so check:ui starts from it (ADR 0025). Runs once: the lock is the team's. */
export function baselinePrimitives() {
  const rel = 'shadcn-primitives.lock.json'
  if (existsSync(join(ctx.target, rel)) || !existsSync(join(ctx.target, 'src/shared/ui'))) return
  const r = run(process.execPath, ['scripts/check-ui.mjs', '--baseline'], { quiet: true })
  if (r.status !== 0) {
    ctx.manual.push(`Could not record src/shared/ui in ${rel}: ${(r.stderr ?? '').trim()}`)
    return
  }
  log('created', rel, 'records the files in src/shared/ui')
  ctx.manual.push(`${rel} records every file in src/shared/ui as a generated primitive. If one is your own code, or a primitive your team already changed, read docs/04-stack/tailwind-shadcn.md, "Changing a primitive".`)
}
