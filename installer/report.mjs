// Stage 4: run the gates and print what the run did and what is left for a person.
import { join } from 'node:path'

import { ctx, run } from './context.mjs'
import { readJson } from './files.mjs'

// Same order as docs/03-standards/linting-and-formatting.md. `build` is left to CI: it is the slow one.
const GATES = ['check', 'lint', 'typecheck', 'test', 'check:suppressions', 'check:gates', 'check:ui', 'check:docs']
/** Lines of a failing gate's output shown inline; the rest is one `pnpm <gate>` away. */
const FAILURE_LINES_SHOWN = 12
const INDENT = '        '

export function verify() {
  const scripts = readJson(join(ctx.target, 'package.json')).scripts ?? {}
  console.log('\nGates (a failure here is real: fix the code, never the gate):')
  let ok = true
  for (const name of GATES) {
    if (!scripts[name]) {
      console.log(`  SKIP  pnpm ${name}  (no such script in package.json)`)
      continue
    }
    const r = run('pnpm', ['run', '-s', name], { quiet: true })
    const pass = r.status === 0
    ok &&= pass
    console.log(`  ${pass ? 'PASS' : 'FAIL'}  pnpm ${name}`)
    if (!pass) printFailure(name, `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().split('\n'))
  }
  if (!ok) ctx.failed = true
  return ok
}

function printFailure(name, out) {
  console.log(out.slice(0, FAILURE_LINES_SHOWN).map((l) => INDENT + l).join('\n'))
  if (out.length > FAILURE_LINES_SHOWN) console.log(`${INDENT}... ${out.length - FAILURE_LINES_SHOWN} more line(s): run \`pnpm ${name}\``)
  if (out.some((l) => l.includes('Cannot redefine plugin'))) {
    console.log(`${INDENT}Cause: two copies of a plugin are installed (usually typescript-eslint). Run the installer again: it aligns them.`)
  }
}

export function printReport() {
  const counts = {}
  for (const r of ctx.report) counts[r.action] = (counts[r.action] ?? 0) + 1
  const interesting = ctx.report.filter((r) => r.action !== 'unchanged' && !(r.action === 'created' && /^(docs|\.claude\/skills)\//.test(r.path)))
  console.log('')
  const showNote = (r) => r.note && r.note !== 'generated' && r.note !== r.path && !r.note.startsWith('docs/') && !r.note.startsWith('scripts/')
  for (const r of interesting) console.log(`  ${r.action.padEnd('unchanged'.length)} ${r.path}${showNote(r) ? '  (' + r.note + ')' : ''}`)
  console.log('\n  ' + Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', '))
  if (ctx.manual.length > 0) {
    console.log('\nDo these by hand:')
    ctx.manual.forEach((m, i) => console.log(`  ${i + 1}. ${m}`))
  }
  const kept = ctx.report.filter((r) => r.action === 'kept')
  if (kept.length > 0) console.log(`\n${kept.length} file(s) differ from the docs copy and were kept. Compare them, or re-run with --force.`)
}
