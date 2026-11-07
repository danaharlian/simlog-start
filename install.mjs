#!/usr/bin/env node
// install.mjs: one-command setup of this documentation repo into a TanStack Start app.
//
//   cd your-app
//   bash /path/to/ai-coding-docs/install.sh            (or: node /path/to/ai-coding-docs/install.mjs)
//
// What it does, in order (every step is safe to repeat). Each stage lives in its own file under installer/:
//   1. Copies AGENTS.md, CLAUDE.md, docs/, .claude/skills/, .mcp.json, scripts/check-docs.mjs, and the installer
//      (copy-docs.mjs).
//   2. Installs the quality gates from docs/examples/ into the places the docs name:
//      eslint.boundaries.js, eslint.code-rules.js, eslint.no-suppress.js, scripts/check-*.mjs, .claude/hooks/, .claude/settings.json,
//      .github/CODEOWNERS, and a small generated eslint.ai-docs.js that bundles them (quality-gates.mjs).
//   3. Patches package.json (scripts, pinned devDependencies, `latest` -> caret range), tsconfig.json (strict flags),
//      eslint.config.js (two lines), .prettierignore, and components.json (patch-config.mjs, shadcn.mjs).
//      Then runs `pnpm install` (pnpm.mjs).
//   4. Runs the gates and prints a summary (report.mjs).
// It never touches README.md and never overwrites a file you changed (it reports it instead; --force overwrites
// after saving a backup). A manifest at .claude/ai-docs-manifest.json lets a later run update only untouched files
// (manifest.mjs).
//
// Zero dependencies. Needs Node 20+ and pnpm in the target app.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { ctx, initContext, step, stop } from './installer/context.mjs'
import { copyDocs } from './installer/copy-docs.mjs'
import { readJson } from './installer/files.mjs'
import { loadManifest, pruneStale, saveManifest } from './installer/manifest.mjs'
import { baselinePrimitives, patchEslintConfig, patchPackageJson, patchPrettierIgnore, patchTsconfig } from './installer/patch-config.mjs'
import { alignTypescriptEslint, formatInstalledFiles, installDependencies, resolveLatestTags } from './installer/pnpm.mjs'
import { installQualityGates } from './installer/quality-gates.mjs'
import { printReport, verify } from './installer/report.mjs'
import { patchComponentsJson } from './installer/shadcn.mjs'

const HELP = `Usage: bash /path/to/ai-coding-docs/install.sh [options]   (run it from the root of your TanStack Start app)

  --target <dir>   app root (default: current directory)
  --dry-run        show what would change, write nothing
  --force          overwrite files you changed (a backup goes to .ai-docs-backup/)
  --owner <@x/y>   code owner for .github/CODEOWNERS (replaces the placeholder)
  --no-install     do not run pnpm (file and config changes only)
  --no-verify      do not run the gates at the end
  --verify         only run the gates (check, lint, typecheck, test, suppressions, gates, docs) and exit
  --help           this text`

// Flags that take no value, and the option each one sets.
const FLAGS = {
  '--dry-run': 'dryRun',
  '--force': 'force',
  '--no-install': 'noInstall',
  '--no-verify': 'noVerify',
  '--verify': 'verify',
  '--help': 'help',
  '-h': 'help',
}

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  console.log(HELP)
  process.exit(0)
}
initContext(args)
checkTarget()
ctx.manifest = loadManifest()
if (args.verify) process.exit(verify() ? 0 : 1)

step('1/4 Copy files')
copyDocs()

step('2/4 Install the quality gates')
installQualityGates()
pruneStale()

step('3/4 Patch the app config')
patchPackageJson()
patchTsconfig()
patchComponentsJson()
patchEslintConfig()
patchPrettierIgnore()
if (!args.dryRun) baselinePrimitives()
if (!args.dryRun) saveManifest()
if (!args.noInstall && !args.dryRun) {
  installDependencies()
  resolveLatestTags()
  alignTypescriptEslint()
  formatInstalledFiles()
  saveManifest()
}

step('4/4 Verify')
noteCopiedReadme()
printReport()
if (args.dryRun) {
  console.log('\nDry run: nothing was written.')
} else if (args.noVerify || args.noInstall) {
  console.log('\nSkipped the gates. Run the installer again with --verify later.')
} else {
  verify()
}
process.exit(ctx.failed ? 1 : 0)

function parseArgs(argv) {
  const a = { target: undefined, owner: undefined }
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i]
    if (v === '--target') a.target = argv[++i]
    else if (v === '--owner') a.owner = argv[++i]
    else if (v in FLAGS) a[FLAGS[v]] = true
    else {
      console.error(`Unknown option: ${v}. Try --help.`)
      process.exit(2)
    }
  }
  return a
}

/** Stops unless the target is a TanStack Start app. */
function checkTarget() {
  // In place: the documentation folder was copied INTO the app, so the installer sits in the app root.
  // That is allowed when the folder is a TanStack Start app; the copy steps then find identical files.
  if (ctx.inPlace && !existsSync(join(ctx.target, 'package.json'))) {
    stop('Run this from your app root: cd <your app> && bash /path/to/ai-coding-docs/install.sh (this folder has no package.json, so it is the documentation repo, not an app).')
  }
  if (!existsSync(join(ctx.target, 'package.json'))) stop(`No package.json in ${ctx.target}. Run it from the app root.`)
  const pkg = readJson(join(ctx.target, 'package.json'))
  if (!{ ...pkg.dependencies, ...pkg.devDependencies }['@tanstack/react-start']) {
    stop('This does not look like a TanStack Start app (@tanstack/react-start is not in package.json).')
  }
}

/** Copying the whole docs folder into the app replaces the app's README; say so. */
function noteCopiedReadme() {
  const readme = join(ctx.target, 'README.md')
  if (ctx.inPlace && existsSync(readme) && readFileSync(readme, 'utf8').startsWith('# AI Agentic Coding Docs')) {
    ctx.manual.push("README.md in your app root is the documentation repo's README (the copy replaced yours). Restore your own: git checkout -- README.md")
  }
}

