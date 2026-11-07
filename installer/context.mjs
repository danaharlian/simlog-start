// State of one installer run, shared by every stage: where it reads, where it writes, and what it reports.
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The documentation repo (or the app root, when the installer runs from its copy inside the app). */
export const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const MANIFEST = '.claude/ai-docs-manifest.json'

export const ctx = {
  /** App root that receives the files. */
  target: '',
  args: {},
  /** The documentation folder was copied INTO the app, so the installer sits in the app root. */
  inPlace: false,
  /** { action, path, note } for every file the run looked at. */
  report: [],
  /** Steps a person has to do; printed at the end. */
  manual: [],
  manifest: { files: {} },
  /** Written in this run: their final hash is recorded after formatting. */
  touched: new Set(),
  /** Shipped in this run: anything else in the manifest is stale. */
  placed: new Set(),
  /** Config files Prettier formats after the install. */
  formatted: [],
  failed: false,
}

export function initContext(args) {
  ctx.args = args
  ctx.target = resolve(args.target ?? process.cwd())
  ctx.inPlace = ctx.target === SRC
}

export function log(action, path, note = '') {
  ctx.report.push({ action, path, note })
}

export function step(title) {
  console.log(`\n== ${title}`)
}

export function run(cmd, cmdArgs, opts = {}) {
  return spawnSync(cmd, cmdArgs, { cwd: ctx.target, stdio: opts.quiet ? 'pipe' : 'inherit', encoding: 'utf8' })
}

export function stop(message) {
  console.error(`install: ${message}`)
  process.exit(2)
}
