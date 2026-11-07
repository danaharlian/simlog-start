// Stage 3, pnpm part: install the toolchain, settle pnpm's build approvals, align typescript-eslint, pin `latest`.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { ctx, log, run } from './context.mjs'
import { readJson, writeJsonLike } from './files.mjs'

/** Tested versions (docs/04-stack/versions.md, ADR 0006 and 0007). Exact pins: a bump is a reviewed change. */
const TOOLCHAIN = {
  'typescript-eslint': '8.72.0',
  '@eslint-community/eslint-plugin-eslint-comments': '4.8.1',
  'eslint-plugin-boundaries': '7.2.0',
  'eslint-import-resolver-typescript': '4.4.5',
  vitest: '5.0.5',
}
const BUILD_DECISIONS = { 'unrs-resolver': false }

/**
 * pnpm 11 and newer refuse to finish an install while a dependency with a build script has no decision in
 * pnpm-workspace.yaml (ERR_PNPM_IGNORED_BUILDS). eslint-import-resolver-typescript brings unrs-resolver, whose script
 * only checks the prebuilt native binding that arrives as an optional dependency, so it is set to false (not run):
 * the safer choice, and the gates were run in that state. Any other undecided package is left for a human.
 */
function settleBuildApprovals() {
  const file = join(ctx.target, 'pnpm-workspace.yaml')
  if (!existsSync(file)) return false
  const original = readFileSync(file, 'utf8')
  let text = original
  const unresolved = []
  text = text.replace(/^(\s+)(['"]?)([^\s:'"]+)\2:\s*set this to true or false\s*$/gm, (line, indent, _q, name) => {
    if (name in BUILD_DECISIONS) return `${indent}${name}: ${BUILD_DECISIONS[name]}`
    unresolved.push(name)
    return line
  })
  if (/^allowBuilds:\s*$/m.test(text)) {
    for (const [name, value] of Object.entries(BUILD_DECISIONS)) {
      if (!new RegExp(`^\\s+['"]?${name}['"]?:`, 'm').test(text)) text = text.replace(/^allowBuilds:\s*$/m, `allowBuilds:\n  ${name}: ${value}`)
    }
  }
  if (unresolved.length > 0) {
    ctx.manual.push(`pnpm-workspace.yaml asks for a build decision (true or false) for: ${unresolved.join(', ')}. Run pnpm approve-builds and choose.`)
  }
  if (text === original) return false
  if (!ctx.args.dryRun) writeFileSync(file, text)
  log('updated', 'pnpm-workspace.yaml', 'allowBuilds: unrs-resolver set to false (its build script only checks a prebuilt binary)')
  return true
}

export function installDependencies() {
  const pkg = readJson(join(ctx.target, 'package.json'))
  const installed = { ...pkg.dependencies, ...pkg.devDependencies }
  const missing = Object.entries(TOOLCHAIN).filter(([name, version]) => (name === 'typescript-eslint' ? !installed[name] : installed[name] !== version))
  console.log('\nInstalling dependencies with pnpm ...')
  settleBuildApprovals()
  // The installer changes package.json on purpose, and with CI=true pnpm would refuse to update the lockfile for it.
  const command = missing.length > 0 ? ['add', '-D', '-E', ...missing.map(([n, v]) => `${n}@${v}`)] : ['install', '--no-frozen-lockfile']
  let r = run('pnpm', command)
  if (r.status !== 0 && settleBuildApprovals()) r = run('pnpm', command) // pnpm wrote a placeholder and stopped: decide and retry
  if (r.status !== 0) {
    ctx.failed = true
    ctx.manual.push(`pnpm ${command.join(' ')} failed. Run it yourself and read the error.`)
  } else if (missing.length > 0) {
    log('updated', 'package.json', 'added ' + missing.map(([n]) => n).join(', '))
  }
}

/**
 * ESLint refuses to load two different copies of the same plugin ("Cannot redefine plugin"). @tanstack/eslint-config
 * brings its own typescript-eslint, and eslint.no-suppress.js imports the app's. pnpm may keep them at two versions
 * (it reuses the lockfile's older transitive version), so the app's copy is moved to the version the config uses.
 */
// Runs in a fresh Node process on purpose: module resolution is cached per process, and the check must see the
// node_modules that pnpm has just rewritten.
const COPIES_PROBE = `
import { createRequire } from 'node:module'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join } from 'node:path'
const target = process.argv[1]
const root = (file, name) => {
  let dir = dirname(file)
  while (dir !== dirname(dir)) {
    const candidate = join(dir, 'package.json')
    if (existsSync(candidate) && JSON.parse(readFileSync(candidate, 'utf8')).name === name) return dir
    dir = dirname(dir)
  }
}
const configDir = join(target, 'node_modules', '@tanstack', 'eslint-config')
if (!existsSync(configDir)) process.exit(3)
const tsEslint = (from) => root(createRequire(join(from, 'package.json')).resolve('typescript-eslint'), 'typescript-eslint')
const app = tsEslint(target)
const config = tsEslint(realpathSync(configDir))
// What ESLint compares is the plugin object, which lives in @typescript-eslint/eslint-plugin: compare that package.
const plugin = (dir) => {
  const entry = createRequire(join(realpathSync(dir), 'package.json')).resolve('@typescript-eslint/eslint-plugin')
  return realpathSync(root(entry, '@typescript-eslint/eslint-plugin') ?? entry)
}
const version = (dir) => JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version
console.log(JSON.stringify({ same: plugin(app) === plugin(config), appVersion: version(app), configVersion: version(config) }))
`

function typescriptEslintCopies() {
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', COPIES_PROBE, ctx.target], { cwd: ctx.target, encoding: 'utf8' })
  if (r.status !== 0) return undefined
  try {
    return JSON.parse(r.stdout.trim().split('\n').at(-1) ?? '')
  } catch {
    return undefined
  }
}

export function alignTypescriptEslint() {
  const copies = typescriptEslintCopies()
  if (!copies || copies.same) return
  console.log(`\nAligning typescript-eslint: the app has ${copies.appVersion}, @tanstack/eslint-config uses ${copies.configVersion} ...`)
  const add = ['add', '-D', '-E', `typescript-eslint@${copies.configVersion}`]
  if (run('pnpm', add).status !== 0 && settleBuildApprovals()) run('pnpm', add)
  if (typescriptEslintCopies()?.same) {
    log('updated', 'package.json', `typescript-eslint pinned to ${copies.configVersion} (the version @tanstack/eslint-config uses)`)
    return
  }
  ctx.failed = true
  ctx.manual.push(
    `Two copies of typescript-eslint are installed (app ${copies.appVersion}, @tanstack/eslint-config ${copies.configVersion}) and ESLint cannot load both. Run: pnpm add -D -E typescript-eslint@${copies.configVersion} && pnpm dedupe`,
  )
}

/** Replaces `latest` ranges with a caret range of the installed version, so `pnpm update` cannot jump majors. */
export function resolveLatestTags() {
  const rel = 'package.json'
  const original = readFileSync(join(ctx.target, rel), 'utf8')
  const next = JSON.parse(original)
  const done = []
  for (const group of ['dependencies', 'devDependencies']) {
    for (const [name, spec] of Object.entries(next[group] ?? {})) {
      if (spec !== 'latest') continue
      try {
        const version = readJson(join(ctx.target, 'node_modules', name, 'package.json')).version
        next[group][name] = `^${version}`
        done.push(`${name}@${version}`)
      } catch {
        ctx.manual.push(`Could not read the installed version of ${name}: replace "latest" in package.json by hand.`)
      }
    }
  }
  if (done.length === 0) return
  writeJsonLike(rel, original, next)
  log('updated', rel, '"latest" -> caret: ' + done.join(', '))
  if (run('pnpm', ['install', '--no-frozen-lockfile']).status !== 0) {
    ctx.failed = true
    ctx.manual.push('pnpm install failed after "latest" was replaced, so pnpm-lock.yaml may not match package.json. Run `pnpm install` yourself and read the error.')
  }
}

export function formatInstalledFiles() {
  const files = ctx.formatted.filter((f) => existsSync(join(ctx.target, f)))
  const r = run('pnpm', ['exec', 'prettier', '--write', ...files], { quiet: true })
  if (r.status !== 0) ctx.manual.push('Prettier could not format the installed config files: run `pnpm format`.')
}
