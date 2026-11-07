// File helpers relative to the app root. One directory walk for the whole installer.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { ctx } from './context.mjs'

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function write(rel, content) {
  const abs = join(ctx.target, rel)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, content)
}

/** The indent a JSON file already uses, so a rewrite keeps its style. */
export function indentOf(text) {
  return /^([ \t]+)"/m.exec(text)?.[1] ?? '  '
}

/** Writes `obj` in the style of `original`. Returns false when nothing would change. */
export function writeJsonLike(rel, original, obj) {
  const text = JSON.stringify(obj, null, indentOf(original)) + (original.endsWith('\n') ? '\n' : '')
  if (text === original) return false
  if (!ctx.args.dryRun) write(rel, text)
  return true
}

/** Files under `base/dir`, as sorted paths relative to `base` with forward slashes. Empty when `dir` is missing. */
export function listFiles(base, dir) {
  const abs = join(base, dir)
  if (!existsSync(abs)) return []
  const out = []
  for (const name of readdirSync(abs)) {
    const rel = `${dir}/${name}`
    if (statSync(join(base, rel)).isDirectory()) out.push(...listFiles(base, rel))
    else out.push(rel)
  }
  return out.sort()
}

export function isFile(rel) {
  const abs = join(ctx.target, rel)
  return existsSync(abs) && statSync(abs).isFile()
}
