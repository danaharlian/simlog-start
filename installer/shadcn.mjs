// Stage 3, shadcn part: point components.json at shared/ and move the scaffold's shadcn folders there.
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'

import { ctx, log } from './context.mjs'
import { isFile, listFiles, write } from './files.mjs'
import { matchBracket, parseJsonc } from './jsonc.mjs'

// shadcn `components.json` aliases: generated primitives land in `shared/`, not in `src/components` (docs/04-stack/tailwind-shadcn.md).
const SHADCN_ALIASES = {
  components: '@/shared/ui',
  utils: '@/shared/lib/utils',
  ui: '@/shared/ui',
  lib: '@/shared/lib',
  hooks: '@/shared/hooks',
}
// Where the scaffold puts shadcn files by default, and where they go. First matching prefix wins.
const SHADCN_DIR_MOVES = [
  ['src/components/ui', 'src/shared/ui'],
  ['src/components', 'src/shared/ui'],
  ['src/lib', 'src/shared/lib'],
  ['src/hooks', 'src/shared/hooks'],
]
const SHADCN_SOURCE_DIRS = ['src/components', 'src/lib', 'src/hooks']
const SHADCN_OLD_IMPORTS = ['@/components/ui', '@/lib/utils', '@/hooks']
const RESOLVE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css']
// A module specifier: the string after `from`, `import`, `import(`, `require(`, `vi.mock(`.
const SPECIFIER = /(\b(?:from|import|require|mock|doMock|importActual)\s*\(?\s*)(['"])([^'"\n]+)\2/g
const CODE_FILE = /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts)$/

export function patchComponentsJson() {
  const rel = 'components.json'
  const abs = join(ctx.target, rel)
  if (!existsSync(abs)) return log('unchanged', rel, 'not found (shadcn is not set up yet): run the installer again once it is')
  const byHand = `components.json: set "aliases" to ${JSON.stringify(SHADCN_ALIASES)} by hand.`
  const text = readFileSync(abs, 'utf8')
  let aliases
  try {
    aliases = parseJsonc(text).aliases
  } catch {
    return ctx.manual.push('components.json could not be read. ' + byHand.replace('components.json: ', ''))
  }
  const open = /"aliases"\s*:\s*\{/.exec(text)
  const braceAt = open ? open.index + open[0].length - 1 : -1
  const end = braceAt >= 0 ? matchBracket(text, braceAt) : null
  if (!aliases || typeof aliases !== 'object' || !end) return ctx.manual.push(byHand)
  const { block, changed } = aliasBlock(text, aliases, { open, braceAt, close: end.close })
  if (changed.length === 0) {
    log('unchanged', rel, 'shadcn aliases already point to shared/')
  } else {
    const next = text.slice(0, braceAt) + block + text.slice(end.close + 1)
    if (!aliasesMatch(next)) return ctx.manual.push(byHand)
    if (!ctx.args.dryRun) write(rel, next)
    log('updated', rel, 'aliases now point to shared/: ' + changed.join(', '))
  }
  moveShadcnFiles()
}

/** The `aliases` object rewritten to SHADCN_ALIASES, in the file's own style, and the keys that changed. */
function aliasBlock(text, aliases, { open, braceAt, close }) {
  let block = text.slice(braceAt, close + 1)
  const nl = text.includes('\r\n') ? '\r\n' : '\n'
  const lineIndent = /(?:^|\n)([ \t]*)$/.exec(text.slice(0, open.index))?.[1] ?? ''
  const changed = []
  // Reversed, because a missing key is inserted at the top of the block: this keeps the declared order.
  for (const [key, value] of Object.entries(SHADCN_ALIASES).reverse()) {
    if (aliases[key] === value) continue
    const existing = new RegExp(`("${key}"\\s*:\\s*)"[^"]*"`)
    if (existing.test(block)) {
      block = block.replace(existing, (_all, head) => head + JSON.stringify(value))
    } else {
      const inner = block.slice(1, -1)
      const indent = /\n([ \t]+)\S/.exec(inner)?.[1] ?? lineIndent + '  '
      block = `{${nl}${indent}"${key}": ${JSON.stringify(value)}${inner.trim() === '' ? `${nl}${lineIndent}}` : ',' + inner + '}'}`
    }
    changed.unshift(key)
  }
  return { block, changed }
}

function aliasesMatch(text) {
  try {
    const aliases = parseJsonc(text).aliases
    return Object.entries(SHADCN_ALIASES).every(([k, v]) => aliases?.[k] === v)
  } catch {
    return false
  }
}

/**
 * Move the shadcn default folders (src/components, src/lib, src/hooks) into src/shared/ and rewrite every import that
 * points at a moved file, alias or relative. Files already under src/shared/ are left alone, so a second run does nothing.
 * A destination that already exists is never overwritten: that file stays and is reported.
 */
function moveShadcnFiles() {
  const plan = planMoves()
  if (plan.size === 0) {
    log('unchanged', 'src/', 'shadcn folders are already under src/shared/')
    return noteShadcnMoves(false)
  }
  const { edits, rewritten } = rewriteImports(plan)
  if (!ctx.args.dryRun) {
    for (const [from, to] of plan) {
      mkdirSync(dirname(join(ctx.target, to)), { recursive: true })
      renameSync(join(ctx.target, from), join(ctx.target, to))
    }
    for (const [from, next] of edits) writeFileSync(join(ctx.target, plan.get(from) ?? from), next)
    for (const dir of SHADCN_SOURCE_DIRS) pruneEmptyDirs(join(ctx.target, dir))
  }
  const where = SHADCN_SOURCE_DIRS.filter((dir) => [...plan.keys()].some((p) => p.startsWith(dir + '/'))).join(', ')
  log('updated', where, `${ctx.args.dryRun ? 'would move' : 'moved'} ${plan.size} file(s) into src/shared/ (ui, lib, hooks), ${rewritten} import(s) rewritten`)
  noteShadcnMoves(ctx.args.dryRun)
}

/** from -> to for each file to move; a destination that exists is left out and reported. */
function planMoves() {
  const plan = new Map()
  for (const from of SHADCN_SOURCE_DIRS.flatMap((dir) => listFiles(ctx.target, dir))) {
    const rule = SHADCN_DIR_MOVES.find(([prefix]) => from.startsWith(prefix + '/'))
    if (rule) plan.set(from, rule[1] + from.slice(rule[0].length))
  }
  const taken = new Set()
  for (const [from, to] of [...plan]) {
    if (isFile(to) || taken.has(to)) {
      plan.delete(from)
      ctx.manual.push(`${from} was not moved: ${to} already exists. Merge the two by hand.`)
    } else {
      taken.add(to)
    }
  }
  return plan
}

/** New text for every file whose imports point at a moved file, keyed by its current path. */
function rewriteImports(plan) {
  const edits = new Map()
  let rewritten = 0
  for (const from of importerFiles()) {
    const now = plan.get(from) ?? from
    const text = readFileSync(join(ctx.target, from), 'utf8')
    const next = text.replace(SPECIFIER, (all, head, quote, spec) => {
      const out = movedSpecifier({ from, now, spec, plan })
      if (out === null || out === spec) return all
      rewritten++
      return head + quote + out + quote
    })
    if (next !== text || now !== from) edits.set(from, next)
  }
  return { edits, rewritten }
}

/** The specifier `spec` in file `from` (moving to `now`) after the move, or null when it stays as is. */
function movedSpecifier({ from, now, spec, plan }) {
  const hit = resolveSpecifier(from, spec)
  if (!hit) return null
  const target = plan.get(hit.file) ?? hit.file
  const isRelative = spec.startsWith('.')
  if (target === hit.file && !(isRelative && now !== from)) return null
  const bare = hit.kind === 'ext' ? target.slice(0, -posix.extname(target).length) : hit.kind === 'index' ? posix.dirname(target) : target
  if (!isRelative) return '@/' + posix.relative('src', bare)
  const out = posix.relative(posix.dirname(now), bare) || '.'
  return out.startsWith('.') ? out : './' + out
}

/** Which file an import points at, in the layout as it is now. kind: written as is, without extension, or as a folder. */
function resolveSpecifier(fromRel, spec) {
  let base
  if (spec.startsWith('@/')) base = posix.join('src', spec.slice(2))
  else if (spec.startsWith('.')) base = posix.join(posix.dirname(fromRel), spec)
  else return null
  base = posix.normalize(base)
  if (isFile(base)) return { file: base, kind: 'exact' }
  for (const ext of RESOLVE_EXTS) if (isFile(base + ext)) return { file: base + ext, kind: 'ext' }
  for (const ext of RESOLVE_EXTS) if (isFile(`${base}/index${ext}`)) return { file: `${base}/index${ext}`, kind: 'index' }
  return null
}

/** Source files whose imports may need to change: everything under src/ and the code files in the app root. */
function importerFiles() {
  const root = readdirSync(ctx.target).filter((n) => CODE_FILE.test(n) && statSync(join(ctx.target, n)).isFile() && !/^(install\.|eslint\.)/.test(n))
  return [...root, ...listFiles(ctx.target, 'src').filter((p) => CODE_FILE.test(p) && !p.endsWith('.gen.ts'))]
}

function pruneEmptyDirs(abs) {
  if (!existsSync(abs) || !statSync(abs).isDirectory()) return
  for (const name of readdirSync(abs)) pruneEmptyDirs(join(abs, name))
  if (readdirSync(abs).length === 0) rmdirSync(abs)
}

/** What still needs a human after the move: leftovers, imports still pointing at the old paths, the missing utils file. */
function noteShadcnMoves(planned) {
  if (planned) return
  for (const dir of SHADCN_SOURCE_DIRS) {
    if (listFiles(ctx.target, dir).length > 0) ctx.manual.push(`${dir} still has files (see above). The shadcn CLI writes into src/shared/ now, so keep one place.`)
  }
  const stale = filesImporting(SHADCN_OLD_IMPORTS)
  if (stale.length > 0) {
    ctx.manual.push(`${stale.length} file(s) in src/ import from the old shadcn paths (${SHADCN_OLD_IMPORTS.join(', ')}), for example ${stale[0]}. Change them to @/shared/ui, @/shared/lib/utils, @/shared/hooks.`)
  }
  const utilsExists = ['src/lib/utils.ts', 'src/shared/lib/utils.ts'].some((p) => existsSync(join(ctx.target, p)))
  if (!utilsExists) ctx.manual.push('Generated shadcn components import cn from @/shared/lib/utils, and that file does not exist yet: create it before running `shadcn add` (what it exports comes from your scaffold; see docs/04-stack/tailwind-shadcn.md).')
}

function filesImporting(needles) {
  return listFiles(ctx.target, 'src')
    .filter((p) => /\.(ts|tsx)$/.test(p) && !p.endsWith('.gen.ts'))
    .filter((p) => {
      const text = readFileSync(join(ctx.target, p), 'utf8')
      return needles.some((n) => text.includes(`'${n}`) || text.includes(`"${n}`))
    })
}
