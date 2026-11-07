// Copying with a manifest, so a re-run updates untouched files and never overwrites your edits.
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { ctx, log, MANIFEST, SRC } from './context.mjs'
import { listFiles, write } from './files.mjs'

/** The installer's own files, copied into the app so it can run again from there. */
export const INSTALLER_FILES = ['install.sh', 'install.mjs', ...listFiles(SRC, 'installer')]

function sha(buf) {
  return createHash('sha256').update(buf).digest('hex')
}

function backup(rel) {
  const dest = join(ctx.target, '.ai-docs-backup', rel)
  mkdirSync(dirname(dest), { recursive: true })
  copyFileSync(join(ctx.target, rel), dest)
}

/** created | updated | unchanged | kept, decided from the file on disk, the shipped copy, and the manifest. */
function decide(rel, srcSha) {
  const abs = join(ctx.target, rel)
  if (!existsSync(abs)) return 'created'
  const dstSha = sha(readFileSync(abs))
  const entry = ctx.manifest.files[rel]
  const untouched = entry?.dst === dstSha
  let action
  if (dstSha === srcSha) action = 'unchanged'
  else if (untouched) action = entry.src === srcSha ? 'unchanged' : 'updated'
  else action = ctx.args.force ? 'updated' : 'kept'
  if (action === 'updated' && !untouched && !ctx.args.dryRun) backup(rel)
  return action
}

/** Core decision for one managed file. Returns created | updated | unchanged | kept. */
export function placeContent(rel, content, srcRel) {
  ctx.placed.add(rel)
  const abs = join(ctx.target, rel)
  const srcSha = sha(content)
  const action = decide(rel, srcSha)
  if ((action === 'created' || action === 'updated') && !ctx.args.dryRun) {
    write(rel, content)
    ctx.manifest.files[rel] = { src: srcSha, dst: srcSha }
    ctx.touched.add(rel) // its final hash is recorded after formatting
  } else if (action === 'unchanged' && !ctx.args.dryRun && existsSync(abs) && !ctx.manifest.files[rel]) {
    ctx.manifest.files[rel] = { src: srcSha, dst: sha(readFileSync(abs)) }
  }
  // A "kept" file is never recorded: its manifest entry must keep the hash of what we wrote, so your edit stays visible.
  log(action, rel, action === 'kept' ? 'differs from the docs copy; yours is kept (--force overwrites, with a backup)' : srcRel)
  return action
}

export function place(srcRel, dstRel) {
  return placeContent(dstRel, readFileSync(join(SRC, srcRel)), srcRel)
}

export function placeText(dstRel, text) {
  return placeContent(dstRel, Buffer.from(text), 'generated')
}

export function copyTree(srcRel, dstRel) {
  for (const rel of listFiles(SRC, srcRel)) place(rel, dstRel + rel.slice(srcRel.length))
}

// Files an earlier version installed and this one no longer ships (a renamed skill, for example), and skill folders
// left empty when an install was undone. Git does not track empty folders, so `git status` shows nothing, yet
// check-docs fails on each one. A file you edited is reported, never deleted.
export function pruneStale() {
  // Shipped, but placed only on the first run: later runs merge into them or leave them alone.
  const placedOnce = new Set(['.mcp.json', '.github/CODEOWNERS', ...(ctx.inPlace ? INSTALLER_FILES : [])])
  for (const [rel, entry] of Object.entries(ctx.manifest.files)) {
    if (!ctx.placed.has(rel) && !placedOnce.has(rel)) pruneFile(rel, entry)
  }
  pruneEmptySkillFolders()
}

function pruneFile(rel, entry) {
  const abs = join(ctx.target, rel)
  if (!existsSync(abs)) {
    if (!ctx.args.dryRun) delete ctx.manifest.files[rel]
    return
  }
  if (sha(readFileSync(abs)) !== entry.dst) {
    ctx.manual.push(`${rel} is no longer shipped by the docs, and you edited it. Compare it with the current docs, then delete it.`)
    return
  }
  if (!ctx.args.dryRun) {
    rmSync(abs)
    delete ctx.manifest.files[rel]
  }
  log('removed', rel, 'no longer shipped')
}

function pruneEmptySkillFolders() {
  const skills = join(ctx.target, '.claude/skills')
  if (!existsSync(skills)) return
  for (const entry of readdirSync(skills, { withFileTypes: true })) {
    if (!entry.isDirectory() || existsSync(join(SRC, '.claude/skills', entry.name))) continue
    const dir = join(skills, entry.name)
    if (readdirSync(dir).some((name) => name !== '.DS_Store')) continue
    if (!ctx.args.dryRun) rmSync(dir, { recursive: true })
    log('removed', `.claude/skills/${entry.name}`, 'empty folder left by an earlier install')
  }
}

export function loadManifest() {
  try {
    const m = JSON.parse(readFileSync(join(ctx.target, MANIFEST), 'utf8'))
    if (m && typeof m.files === 'object') return m
  } catch {
    // no manifest yet
  }
  return { files: {} }
}

export function saveManifest() {
  // Only files written in this run get their final (possibly Prettier-formatted) hash recorded.
  for (const rel of ctx.touched) {
    const abs = join(ctx.target, rel)
    const entry = ctx.manifest.files[rel]
    if (existsSync(abs) && entry) entry.dst = sha(readFileSync(abs))
  }
  // A run that changed nothing leaves the manifest, and git, untouched.
  const previous = loadManifest()
  const withoutDate = (m) => JSON.stringify({ ...m, installedAt: undefined })
  if (previous.installedAt && withoutDate(previous) === withoutDate(ctx.manifest)) return
  ctx.manifest.installedAt = new Date().toISOString()
  write(MANIFEST, JSON.stringify(ctx.manifest, null, 2) + '\n')
}
