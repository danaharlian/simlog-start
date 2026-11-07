#!/usr/bin/env node
// Validates the documentation repo. No dependencies.
// Checks: AGENTS.md size, relative links, stack-doc freshness, doc size budgets, skill frontmatter,
// pipeline consistency (phase artifacts, templates, stale file names), skills listed in AGENTS.md and skills.md,
// artifact statuses, unfilled placeholders in final artifacts, the record of who decided each artifact, and the Gate review of approved artifacts.
// Usage: node scripts/check-docs.mjs [--max-age-days=90]
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, dirname, resolve, relative } from 'node:path'

const root = resolve(dirname(new URL(import.meta.url).pathname), '..')
const maxAgeDays = Number((process.argv.find((a) => a.startsWith('--max-age-days=')) ?? '--max-age-days=90').split('=')[1])
const LIMITS = { agents: 120, doc: 200, skill: 150 }

const errors = []
const warnings = []

// Each check script is installed into the app as a single file with no shared module, so it has its own walk()
// (ADR 0034). The installer's copy is installer/files.mjs, listFiles().
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue
    const p = join(dir, name)
    const s = statSync(p)
    if (s.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

const rel = (p) => relative(root, p)
const files = walk(root)
const mdFiles = files.filter((f) => f.endsWith('.md'))

// 1. AGENTS.md size
const agents = join(root, 'AGENTS.md')
if (!existsSync(agents)) errors.push('AGENTS.md is missing')
else {
  const lines = readFileSync(agents, 'utf8').split('\n').length
  if (lines > LIMITS.agents) errors.push(`AGENTS.md has ${lines} lines (limit ${LIMITS.agents})`)
}

// 2. Doc size budgets
for (const f of mdFiles) {
  const r = rel(f)
  const lines = readFileSync(f, 'utf8').split('\n').length
  if (r.startsWith('docs/') && !r.startsWith('docs/templates/') && lines > LIMITS.doc) warnings.push(`${r}: ${lines} lines (budget ${LIMITS.doc})`)
  if (r.startsWith('.claude/skills/') && lines > LIMITS.skill) warnings.push(`${r}: ${lines} lines (budget ${LIMITS.skill})`)
}

// 3. Relative links resolve
const linkRe = /\[[^\]]*\]\(([^)\s]+)\)/g
for (const f of mdFiles) {
  const text = readFileSync(f, 'utf8').replace(/```[\s\S]*?```/g, '')
  for (const m of text.matchAll(linkRe)) {
    const target = m[1]
    if (/^(https?:|mailto:|#)/.test(target)) continue
    const path = target.split('#')[0]
    if (!path) continue
    if (!existsSync(resolve(dirname(f), path))) errors.push(`${rel(f)}: broken link -> ${target}`)
  }
}

// 4. docs/README.md index mentions every doc file
const indexPath = join(root, 'docs/README.md')
if (existsSync(indexPath)) {
  const index = readFileSync(indexPath, 'utf8')
  for (const f of mdFiles) {
    const r = rel(f)
    if (!r.startsWith('docs/') || r === 'docs/README.md') continue
    if (r.startsWith('docs/templates/') || (r.startsWith('docs/decisions/') && r !== 'docs/decisions/README.md')) continue
    const fromDocs = r.slice('docs/'.length)
    if (!index.includes(fromDocs)) warnings.push(`${r} is not listed in docs/README.md`)
  }
}

// 5. Stack docs: front matter and freshness
const today = Date.now()
for (const f of mdFiles.filter((x) => rel(x).startsWith('docs/04-stack/'))) {
  const text = readFileSync(f, 'utf8')
  const fm = text.match(/^---\n([\s\S]*?)\n---/)
  if (!fm) { errors.push(`${rel(f)}: missing front matter`); continue }
  const lv = fm[1].match(/last_verified:\s*(\d{4}-\d{2}-\d{2})/)
  if (!lv) { errors.push(`${rel(f)}: missing last_verified`); continue }
  const ageDays = Math.floor((today - Date.parse(lv[1])) / 86400000)
  if (ageDays > maxAgeDays) warnings.push(`${rel(f)}: last_verified is ${ageDays} days old (max ${maxAgeDays}): re-verify`)
  if (/NOT yet verified/i.test(fm[1])) warnings.push(`${rel(f)}: marked as not yet verified`)
}

// 6. Skills: SKILL.md frontmatter name matches folder, description present
// Folders only: macOS can put a .DS_Store file here.
function skillFolders(dir) {
  return readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name)
}
const skillsDir = join(root, '.claude/skills')
if (existsSync(skillsDir)) {
  for (const name of skillFolders(skillsDir)) {
    const p = join(skillsDir, name, 'SKILL.md')
    if (!existsSync(p)) { errors.push(`.claude/skills/${name}: missing SKILL.md (add it, or delete the folder: an earlier install can leave one empty, and git does not show that)`); continue }
    const fm = readFileSync(p, 'utf8').match(/^---\n([\s\S]*?)\n---/)
    if (!fm) { errors.push(`${rel(p)}: missing front matter`); continue }
    const n = fm[1].match(/^name:\s*(.+)$/m)?.[1]?.trim()
    const d = fm[1].match(/^description:\s*(.+)$/m)?.[1]?.trim()
    if (n !== name) errors.push(`${rel(p)}: name "${n}" does not match folder "${name}"`)
    if (!d || d.length < 30) errors.push(`${rel(p)}: description missing or too short`)
  }
}

// 7. .mcp.json is valid JSON
const mcp = join(root, '.mcp.json')
if (existsSync(mcp)) {
  try { JSON.parse(readFileSync(mcp, 'utf8')) } catch (e) { errors.push(`.mcp.json invalid JSON: ${e.message}`) }
}

// 8. Pipeline consistency: phase artifacts <-> templates <-> references everywhere else
const pipelinePath = join(root, 'docs/01-workflow/sdlc-pipeline.md')
if (existsSync(pipelinePath)) {
  const pipeline = readFileSync(pipelinePath, 'utf8')
  const artifactRe = /(?<![\w-])(\d{2}-[a-z][a-z-]*\.md)/g
  const HISTORICAL_ADRS = new Set(['docs/decisions/0005-pipeline-revision.md', 'docs/decisions/0016-pipeline-templates-comparison.md', 'docs/decisions/0017-pipeline-order.md'])
  const rows = pipeline.split('\n').filter((l) => /^\| \d+ \|/.test(l))
  const artifacts = new Set()
  for (const row of rows) {
    const art = row.match(artifactRe)?.[0]
    if (!art) continue
    artifacts.add(art)
    const tpl = row.match(/templates\/([a-z-]+\.md)/)?.[1]
    if (!tpl) warnings.push(`pipeline: ${art} has no template yet`)
    else if (!existsSync(join(root, 'docs/templates', tpl))) errors.push(`pipeline: ${art} refers to missing template ${tpl}`)
  }
  // every template (except general-purpose ones) belongs to a phase
  const general = new Set(['adr.md', 'pr-checklist.md'])
  for (const f of files.filter((x) => rel(x).startsWith('docs/templates/') && x.endsWith('.md'))) {
    const name = f.split('/').pop()
    if (!general.has(name) && !pipeline.includes(`templates/${name}`)) errors.push(`docs/templates/${name} is not used by any pipeline phase`)
  }
  // artifact names used anywhere must be real phase artifacts (catches stale names after a renumbering)
  for (const f of mdFiles) {
    if (rel(f) === 'docs/01-workflow/sdlc-pipeline.md') continue
    // These ADRs record names that were true when they were written. Only this check skips them, and a new ADR is checked.
    if (HISTORICAL_ADRS.has(rel(f))) continue
    const text = readFileSync(f, 'utf8')
    for (const m of text.matchAll(artifactRe)) {
      if (!artifacts.has(m[1])) errors.push(`${rel(f)}: unknown pipeline artifact ${m[1]}`)
    }
  }
}

// 9. Skills listed everywhere: every skill folder is named in AGENTS.md and in the skills table
if (existsSync(skillsDir)) {
  const agentsText = existsSync(agents) ? readFileSync(agents, 'utf8') : ''
  const skillsDoc = join(root, 'docs/05-agent-tooling/skills.md')
  const skillsText = existsSync(skillsDoc) ? readFileSync(skillsDoc, 'utf8') : ''
  // A folder with no SKILL.md is already reported above; listing it would only repeat that error.
  for (const name of skillFolders(skillsDir).filter((folder) => existsSync(join(skillsDir, folder, 'SKILL.md')))) {
    if (!agentsText.includes(`\`${name}\``)) errors.push(`skill ${name} is not listed in AGENTS.md`)
    if (!skillsText.includes(`| \`${name}\` |`)) errors.push(`skill ${name} is not in the table in docs/05-agent-tooling/skills.md`)
  }
}

// 10. Artifact statuses: one vocabulary, a Gate line, and the "what may start when" table
// (docs/01-workflow/sdlc-pipeline.md section 8). Checked in the templates and in every specs/<slug>/ file.
const ARTIFACTS = {
  '01-idea.md': { template: 'idea.md', statuses: ['draft', 'done', 'dropped'], gates: ['none'], needs: [] },
  '02-research.md': { template: 'research.md', statuses: ['draft', 'done', 'dropped'], gates: ['none'], needs: ['01-idea.md'] },
  '03-prototype.md': { template: 'prototype.md', statuses: ['draft', 'done', 'dropped'], gates: ['none'], needs: ['01-idea.md'], ifPresentFinal: ['02-research.md'] },
  '04-prd.md': { template: 'prd.md', statuses: ['draft', 'in review', 'approved', 'dropped'], gates: ['PRD gate', 'Spec gate'], needs: ['01-idea.md'], ifPresentFinal: ['02-research.md', '03-prototype.md'], tierLNeeds: ['02-research.md'], tierLGate: 'PRD gate' },
  '05-architecture-review.md': { template: 'architecture-review.md', statuses: ['draft', 'in review', 'approved', 'dropped'], gates: ['Architecture gate'], needs: ['04-prd.md'] },
  '06-feature-spec.md': { template: 'feature-spec.md', statuses: ['draft', 'in review', 'approved', 'dropped'], gates: ['Spec gate'], needs: ['04-prd.md'], ifPresentFinal: ['05-architecture-review.md'], tierLNeeds: ['05-architecture-review.md'] },
  '07-tasks.md': { template: 'tasks.md', statuses: ['draft', 'in review', 'approved', 'dropped'], gates: ['Tasks gate', 'Spec gate'], needs: ['06-feature-spec.md'], tierLGate: 'Tasks gate' },
  '08-review-log.md': { template: 'review-log.md', statuses: ['draft', 'done'], gates: ['PR gate'], needs: ['07-tasks.md'] },
  '09-qa.md': { template: 'qa.md', statuses: ['draft', 'done', 'dropped'], gates: ['none'], needs: ['08-review-log.md'] },
  '10-release.md': { template: 'release-checklist.md', statuses: ['draft', 'in review', 'approved', 'dropped'], gates: ['Release gate'], needs: ['09-qa.md'] },
  '11-learnings.md': { template: 'learnings.md', statuses: ['draft', 'done'], gates: ['none'], needs: ['10-release.md'] },
  '12-measure.md': { template: 'measure.md', statuses: ['draft', 'done'], gates: ['none'], needs: ['10-release.md'] },
}
// Who decides each phase. docs/01-workflow/roles.md and the templates must name the same roles; this check compares them.
// Each inner list is one required signature: any of its roles.
const AUTHORITY = {
  '01-idea.md': { field: 'Decided by', needs: [['Product Manager', 'Business Sponsor']] },
  '02-research.md': { field: 'Decided by', needs: [['Product Manager']] },
  '03-prototype.md': { field: 'Decided by', needs: [['Product Manager', 'Product Design Lead']] },
  '04-prd.md': { field: 'Approved by', needs: [['Product Owner', 'Business Sponsor']] },
  '05-architecture-review.md': { field: 'Approved by', needs: [['Software Architect', 'Architecture Review Board']] },
  '06-feature-spec.md': { field: 'Approved by', needs: [['Product Owner'], ['Tech Lead']] },
  '07-tasks.md': { field: 'Approved by', needs: [['Tech Lead']] },
  '08-review-log.md': { field: 'Decided by', needs: [['Tech Lead']] },
  '09-qa.md': { field: 'Decided by', needs: [['QA Lead'], ['Product Owner']] },
  '10-release.md': { field: 'Approved by', needs: [['Release Owner']] },
  '11-learnings.md': { field: 'Decided by', needs: [['Product Manager']] },
  '12-measure.md': { field: 'Decided by', needs: [['Product Manager', 'Business Owner']] },
}
const FINAL = ['approved', 'done']
const headerLine = (text, key) => text.match(new RegExp(`^- ${key}:[ \\t]*(.+)$`, 'm'))?.[1].replace(/`/g, '').trim()
const stripNote = (v) => v.replace(/\s*\(.*$/, '').trim()
const GATE_REVIEWED = new Set(['04-prd.md', '05-architecture-review.md', '06-feature-spec.md', '07-tasks.md', '10-release.md'])
// A tier M PRD is approved at the Spec gate, and its review is recorded in the feature spec.
const REVIEWED_IN_SPEC = new Set(['04-prd.md'])
const APPROVAL_MODES = ['team', 'personal']
const FILE_TIERS = ['M', 'L'] // tier S has no specs/ folder
const AGENT_NAME = /\b(ai agent|agent|agen|claude|chatgpt|gpt|copilot|cursor|gemini|codex)\b/i
const APPROVING_VERDICTS = ['approve', 'approve with notes']
// Blanks code so its text is ignored, and keeps newlines so line numbers still hold.
const blankCode = (text) =>
  text
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/`[^`\n]*`/g, (span) => ' '.repeat(span.length))

function findPlaceholder(text) {
  const lines = blankCode(text).split('\n')
  for (let i = 0; i < lines.length; i++) {
    // Not a placeholder: a URL or email autolink, or a line break tag.
    const m = lines[i].match(/<(?!https?:|mailto:|br\b)[a-zA-Z][^<>@\n]*>/)
    if (m) return { line: i + 1, text: m[0] }
  }
  return null
}

// Reads the Gate review section. The last round decides. `problem` is null when it approves.
function readGateReview(text) {
  const lines = blankCode(text).split('\n')
  const start = lines.findIndex((l) => /^## (?:\d+\. )?(?:PRD |Architecture |Spec |Tasks |Release )?gate review\s*$/i.test(l))
  if (start < 0) return { problem: 'it has no Gate review section' }
  const next = lines.findIndex((l, i) => i > start && /^## /.test(l))
  const section = lines.slice(start + 1, next < 0 ? lines.length : next)
  const cells = (row) => row.split('|').slice(1, -1).map((c) => c.trim())
  const tableRow = (l) => l.trim().startsWith('|')
  const headerAt = section.findIndex((l) => tableRow(l) && cells(l).some((c) => /^verdict\b/i.test(c)))
  if (headerAt < 0) return { problem: 'its Gate review section has no table with a Verdict column' }
  const header = cells(section[headerAt])
  const columnAt = (name) => header.findIndex((c) => new RegExp(`^${name}\\b`, 'i').test(c))
  const verdictAt = columnAt('verdict')
  const roundAt = columnAt('round')
  const reviewerAt = columnAt('reviewer')
  if (reviewerAt < 0) return { problem: 'its Gate review table has no Reviewer column' }
  const rounds = []
  for (const l of section.slice(headerAt + 2)) {
    if (!tableRow(l)) break
    rounds.push(cells(l))
  }
  if (rounds.length === 0) return { problem: 'its Gate review table has no rounds' }
  const roundNumber = (row) => Number(row[roundAt])
  if (roundAt < 0 || rounds.some((row) => !Number.isInteger(roundNumber(row)))) return { problem: 'its Gate review table needs a whole number in the Round column of every row' }
  const last = rounds.reduce((a, b) => (roundNumber(b) >= roundNumber(a) ? b : a))
  const verdict = (last[verdictAt] ?? '').toLowerCase()
  const reviewer = (last[reviewerAt] ?? '').trim()
  if (!APPROVING_VERDICTS.includes(verdict)) return { problem: `the last Gate review round says "${verdict || 'nothing'}" (needs ${APPROVING_VERDICTS.join(' or ')})` }
  if (!reviewer) return { problem: 'the last Gate review round names no reviewer' }
  if (AGENT_NAME.test(reviewer)) return { problem: `the last Gate review round names an agent as reviewer ("${reviewer}"); an agent never approves` }
  const findingsAt = columnAt('findings')
  const hasQuote = findingsAt >= 0 && /["“][^"”]+["”]/.test(last[findingsAt] ?? '')
  return { problem: null, reviewer, hasQuote }
}

// Reads an Approved by or Decided by line. Returns { problem } or { names }. See docs/01-workflow/roles.md.
function readSignoff(text, name, approvalMode, review) {
  const { field, needs } = AUTHORITY[name]
  const raw = headerLine(text, field)
  if (!raw) return { problem: `it has no "- ${field}:" line` }
  const entries = raw.split(';').map((entry) => entry.trim().match(/^(.+?)\s*\(([^)]+)\),\s*(\d{4}-\d{2}-\d{2})(?:,\s*via\s+(chat|review\s+\S+))?$/))
  if (entries.some((m) => !m)) return { problem: `its "${field}:" line must read: name (role), YYYY-MM-DD, optionally followed by ", via chat" or ", via review" and a link; several people are separated by ";"` }
  for (const m of entries) {
    if (AGENT_NAME.test(m[1])) return { problem: `"${field}:" names an agent ("${m[1]}"); an agent never decides` }
  }
  const held = entries.flatMap((m) => m[2].split(',').map((role) => role.trim().toLowerCase()))
  for (const anyOf of needs) {
    if (!anyOf.some((role) => held.includes(role.toLowerCase()))) return { problem: `"${field}:" needs ${anyOf.join(' or ')} (docs/01-workflow/roles.md)` }
  }
  if (entries.some((m) => m[4] === 'chat')) {
    if (approvalMode !== 'personal') return { problem: `"via chat" is only for Approval mode personal, and 01-idea.md says "${approvalMode || 'nothing'}"` }
    if (review.problem === null && !review.hasQuote) return { problem: '"via chat" needs the message quoted in the last Gate review round\'s findings' }
    if (!GATE_REVIEWED.has(name) && !/["“][^"”]+["”]/.test(text.match(/^- Decision quote:(.*)$/m)?.[1] ?? '')) return { problem: '"via chat" needs the message in a "- Decision quote:" line' }
  }
  return { names: entries.map((m) => m[1].toLowerCase()) }
}

const rolesPath = join(root, 'docs/01-workflow/roles.md')
for (const [name, a] of Object.entries(ARTIFACTS)) {
  const tpl = join(root, 'docs/templates', a.template)
  if (existsSync(tpl)) {
    const text = readFileSync(tpl, 'utf8')
    const status = headerLine(text, 'Status')
    const gate = headerLine(text, 'Gate')
    if (!status) errors.push(`docs/templates/${a.template}: missing "- Status:" line`)
    else for (const s of status.split('|').map((x) => x.trim())) if (!a.statuses.includes(s)) errors.push(`docs/templates/${a.template}: status "${s}" is not allowed for ${name} (${a.statuses.join(', ')})`)
    if (!gate) errors.push(`docs/templates/${a.template}: missing "- Gate:" line`)
    else for (const g of gate.split('|').map((x) => stripNote(x))) if (!a.gates.includes(g)) errors.push(`docs/templates/${a.template}: gate "${g}" is not allowed for ${name} (${a.gates.join(', ')})`)
    if (name === '09-qa.md' && !headerLine(text, 'Result')) errors.push(`docs/templates/${a.template}: missing "- Result:" line`)
    const { field, needs } = AUTHORITY[name]
    const signLine = text.match(new RegExp(`^- ${field}:.*$`, 'm'))?.[0] ?? ''
    if (!signLine) errors.push(`docs/templates/${a.template}: missing "- ${field}:" line`)
    const rolesRow = existsSync(rolesPath) ? readFileSync(rolesPath, 'utf8').split('\n').find((l) => l.startsWith(`| \`${name}\` |`)) ?? '' : ''
    if (!rolesRow.includes(field)) errors.push(`docs/01-workflow/roles.md: no row for ${name} recording "${field}:"`)
    for (const role of needs.flat()) {
      if (!signLine.includes(role)) errors.push(`docs/templates/${a.template}: "${field}:" does not name ${role}, which the script requires`)
      if (!rolesRow.includes(role)) errors.push(`docs/01-workflow/roles.md: the row for ${name} does not name ${role}, which the script requires`)
    }
    if (name === '01-idea.md' && !headerLine(text, 'Approval mode')) errors.push(`docs/templates/${a.template}: missing "- Approval mode:" line`)
    if (name === '01-idea.md' && !headerLine(text, 'Tier')) errors.push(`docs/templates/${a.template}: missing "- Tier:" line`)
    if (GATE_REVIEWED.has(name) && !REVIEWED_IN_SPEC.has(name) && !/^## (?:\d+\. )?(?:Spec |Release )?gate review\s*$/im.test(text)) errors.push(`docs/templates/${a.template}: missing Gate review section`)
  }
  if (existsSync(pipelinePath) && !readFileSync(pipelinePath, 'utf8').includes(`| \`${name}\` |`)) errors.push(`pipeline: section 8 has no row for ${name}`)
}

const specsDir = join(root, 'specs')
if (existsSync(specsDir)) {
  for (const slug of readdirSync(specsDir)) {
    const dir = join(specsDir, slug)
    if (!statSync(dir).isDirectory()) continue
    const found = {}
    for (const file of readdirSync(dir)) {
      if (/^\d{2}-.*\.md$/.test(file) && !ARTIFACTS[file]) errors.push(`specs/${slug}/${file}: not a pipeline artifact; older names are renamed per docs/decisions/0017-pipeline-order.md`)
    }
    const ideaPath = join(dir, '01-idea.md')
    const approvalMode = existsSync(ideaPath) ? stripNote(headerLine(readFileSync(ideaPath, 'utf8'), 'Approval mode') ?? '') : ''
    const ideaTier = existsSync(ideaPath) ? stripNote(headerLine(readFileSync(ideaPath, 'utf8'), 'Tier') ?? '') : ''
    for (const [name, a] of Object.entries(ARTIFACTS)) {
      const p = join(dir, name)
      if (!existsSync(p)) continue
      const text = readFileSync(p, 'utf8')
      const where = `specs/${slug}/${name}`
      const status = headerLine(text, 'Status')
      const gate = headerLine(text, 'Gate')
      const hint = 'see docs/01-workflow/sdlc-pipeline.md section 8'
      if (!status) { errors.push(`${where}: missing "- Status:" line (${hint})`); continue }
      if (!a.statuses.includes(status)) { errors.push(`${where}: status "${status}" is not allowed (${a.statuses.join(', ')}; ${hint})`); continue }
      if (!gate) errors.push(`${where}: missing "- Gate:" line (${hint})`)
      else if (!a.gates.includes(stripNote(gate))) errors.push(`${where}: gate "${gate}" is not allowed (${a.gates.join(', ')})`)
      const result = name === '09-qa.md' ? headerLine(text, 'Result') : undefined
      if (name === '09-qa.md' && !['pending', 'pass', 'fail'].includes(result ?? '')) errors.push(`${where}: "- Result:" must be pending, pass, or fail`)
      const ownTier = stripNote(headerLine(text, 'Tier') ?? '')
      // The idea decides. An artifact with no Tier line does not escape the tier L rules.
      const tier = FILE_TIERS.includes(ideaTier) ? ideaTier : ownTier
      if (name === '01-idea.md' && FINAL.includes(status) && !FILE_TIERS.includes(ideaTier)) errors.push(`${where}: "- Tier:" must be ${FILE_TIERS.join(' or ')} (tier S has no specs folder)`)
      if (name !== '01-idea.md' && status !== 'draft' && FILE_TIERS.includes(ideaTier)) {
        for (const declared of [ownTier, stripNote(headerLine(text, 'Tier after research') ?? '')]) {
          if (declared && declared !== ideaTier) errors.push(`${where}: tier "${declared}" differs from 01-idea.md ("${ideaTier}"); update every Tier line and have a human re-confirm`)
        }
      }
      if (tier === 'L' && a.tierLGate && gate && stripNote(gate) !== a.tierLGate) errors.push(`${where}: tier L uses "${a.tierLGate}", not "${gate}"`)
      const review = status === 'approved' && GATE_REVIEWED.has(name) ? readGateReview(text) : {}
      found[name] = { status, result, tier, gate: stripNote(gate ?? ''), tasksGate: stripNote(headerLine(text, 'Tasks gate') ?? '') }
      if (name === '01-idea.md' && FINAL.includes(status) && !APPROVAL_MODES.includes(approvalMode)) errors.push(`${where}: "- Approval mode:" must be team or personal (see docs/01-workflow/sdlc-pipeline.md section 4)`)
      if (FINAL.includes(status)) {
        const placeholder = findPlaceholder(text)
        if (placeholder) errors.push(`${where}:${placeholder.line}: unfilled placeholder ${placeholder.text}, but the status is ${status} (docs/03-standards/writing.md, rule 8)`)
      }
      if (FINAL.includes(status)) {
        const signoff = readSignoff(text, name, approvalMode, review)
        found[name].signers = signoff.names
        if (signoff.problem) errors.push(`${where}: ${status}, but ${signoff.problem}`)
      }
      if (status === 'approved' && GATE_REVIEWED.has(name) && !(REVIEWED_IN_SPEC.has(name) && stripNote(gate ?? '') === 'Spec gate')) {
        const { problem } = review
        if (problem) errors.push(`${where}: approved, but ${problem} (see docs/01-workflow/sdlc-pipeline.md section 4)`)
      }
    }
    // Merged Spec and Tasks gates, or tier M: whoever approves the tasks also approved the spec.
    const spec = found['06-feature-spec.md']
    const tasks = found['07-tasks.md']
    if (spec?.status === 'approved' && tasks?.status === 'approved' && (spec.tasksGate.startsWith('merged') || tasks.gate === 'Spec gate') && spec.signers && tasks.signers && !tasks.signers.every((signer) => spec.signers.includes(signer))) errors.push(`specs/${slug}: merged Spec and Tasks gates, but the tasks were approved by someone who did not approve the spec`)
    for (const [name, now] of Object.entries(found)) {
      const a = ARTIFACTS[name]
      if (!FINAL.includes(now.status)) continue
      const where = `specs/${slug}/${name}`
      for (const need of a.needs) {
        const got = found[need]
        if (!got) errors.push(`${where} is ${now.status} but its prerequisite ${need} does not exist`)
        else if (!FINAL.includes(got.status)) errors.push(`${where} is ${now.status} but ${need} is "${got.status}" (needs ${FINAL.join(' or ')})`)
      }
      for (const need of a.ifPresentFinal ?? []) {
        if (found[need] && !FINAL.includes(found[need].status)) errors.push(`${where} is ${now.status} but ${need} is "${found[need].status}" (finish it, or remove it if skipped)`)
      }
      if (now.tier === 'L') for (const need of a.tierLNeeds ?? []) {
        if (!found[need]) errors.push(`${where} is ${now.status} and tier L, but ${need} does not exist`)
      }
      if (name === '09-qa.md' && now.result === 'pending') errors.push(`${where} is done but "- Result:" is still pending`)
      if (name === '10-release.md' && found['09-qa.md']?.result !== 'pass') errors.push(`${where} is ${now.status} but 09-qa.md "- Result:" is not pass`)
    }
  }
}

for (const w of warnings) console.warn(`warn  ${w}`)
for (const e of errors) console.error(`error ${e}`)
console.log(`\n${mdFiles.length} markdown files checked: ${errors.length} error(s), ${warnings.length} warning(s)`)
process.exit(errors.length ? 1 : 0)
