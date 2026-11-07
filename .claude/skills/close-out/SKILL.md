---
name: close-out
description: Close a feature (pipeline phase 11): turn each agent mistake into a guardrail change, record pipeline feedback and measures, run the close-out checklist. Use right after the release, without waiting for the measure phase, or when a human corrected the agent on a tier S change. Produces 11-learnings.md.
---

# Learn and close out

Pipeline phase 11. Output: `specs/<slug>/11-learnings.md` from `docs/templates/learnings.md`. Tier S: add the line to the PR (`docs/templates/pr-checklist.md`) instead. Inputs: the review log, QA, release, PRs, change logs.

## Steps

1. Collect corrections from evidence only: review-log findings, QA defects, human PR comments, rework. Each cites its id or link. No source, no entry.
2. For each, find why it happened (missing rule, unclear rule, rule not enforced, outdated source, spec gap) and choose the strongest practical guardrail: a failing check (lint rule, test, script) over a skill step over a sentence in a doc (`docs/03-standards/no-suppression.md`, layers).
3. **Make the change** for docs, skills, templates, and tests, in a PR, and link it. Lint, TypeScript, and check-script config need a human (`AGENTS.md`): write the ticket and request it. If `AGENTS.md` changes, keep it within its line limit.
4. A one-off mistake is "not needed" with the reason. Do not pad the table.
5. Tier L: list the docs you re-read and left unchanged with the reason (section 4). Record pipeline and template friction (section 3), decisions with ADR links, and patterns only once they have landed in a doc or skill.
6. Fill the measures by counting from the artifacts; write **Unknown** where nothing recorded them.
7. Run the close-out checklist for real: task statuses, unlinked entry point, flags and spike branches, docs match what shipped (`node scripts/check-docs.mjs`), `TODO(verify)` items, follow-up tickets.
8. Add product and operations findings, with sources. Set the status to `done` only when every row has a link or a reason, and the Product Manager has filled `Decided by:`. The Tech Lead answers for the guardrails.

Before handing over, check the text against `docs/03-standards/writing.md`.

## Output
The file path, the guardrails changed (with links), the tickets opened, and what still needs a human.
