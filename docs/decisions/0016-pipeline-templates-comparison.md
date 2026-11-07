# 0016 Reference template comparison: pipeline, templates, rules, and skills

- Status: accepted (decision AE: two checks applied by the owner on 2026-10-31; the third remains open; artifact names and phase order replaced by ADR 0017)
- Date: 2026-10-31
- Deciders: owner asked for our own version and for missing items to be added; the choices below are the agent's and can be reversed by a new ADR
- Extends: ADR 0005, ADR 0010, ADR 0011, ADR 0014, ADR 0015

## Context

The owner supplied a pipeline guide (`PIPELINE.md`), `PROMPTS.md`, `WORKFLOWS.md`, 11 phase templates and their README, 4 agent rule files, and 9 skills from a Next.js project (12 phases, Server Actions, Prisma, react-hook-form), as references usable in part or in full.

Earlier work had already absorbed most of the templates, so this comparison looked for what was still missing, and at whether our own pipeline holds together. No library API was added. Facts were checked on 2026-10-31 by running `node scripts/check-docs.mjs` on a copy of this repo with a test `specs/` folder (`scripts/` unchanged).

1. **Our gates had no "no".** The status table went `draft → in review → approved`. Nothing said what a reviewer does to send an artifact back, and the Spec gate, which replaced the reference's architecture review, had no record of its review.
2. **A failed QA had no way forward.** `07-qa.md` could say `Result: fail`, and `08-release.md` could not start, but no document said what happens next. The diagram had no arrow back. The reference's does.
3. **`run-pipeline` picked the wrong action during the build.** Its table is first-match-wins, and `An artifact is draft` came before `Phase 6 is running`. `06-review-log.md` stays `draft` through all of phase 6, so the dispatcher would "continue" the review log, not the next slice.
4. **"Pass with accepted risks" had no header value.** `07-qa.md` allows it in its result section, its header allows only `pass` or `fail`, and `check-docs` requires `pass` before release.
5. **Procedures were missing for common requests:** a refactor, a page in an existing feature, a server route, and tests for existing code. Tier S did not list a refactor at all.
6. **The new paths pass the current check.** On a test `specs/` folder, these gave no error: QA failed and recorded; fix slices running with `06-review-log.md` and `07-qa.md` reopened as `draft`; QA passed again with the release `in review`; a PRD sent back to `draft`. These still gave an error: a release `approved` over `Result: fail`, and QA `done` while the review log is reopened.
7. **Stale text:** the tech spec sent logging to `error-handling.md` (moved by ADR 0015); `cross-feature-communication.md` kept a `TODO(verify)` on a logger path that ADR 0015 closed, and the old path; `tanstack-router.md` said the commit policy for `routeTree.gen.ts` was undecided (ADR 0007, L); `progressive-disclosure.md` gave templates a 150-line budget that the check does not apply and `tech-spec.md` exceeds; `README.md` said `AGENTS.md` is about 60 lines; `docs/README.md` omitted the tier S issue template.

## Decision

### Adopted or adapted

| From the reference | Adapted to | Now in |
|---|---|---|
| `REVISION` status, revision arrows, gate prompts | Four verdicts in a "Gate review" table; `draft` means revising, so the status vocabulary and `check-docs` stay as they are | `sdlc-pipeline.md`, section 4; `prd.md`, `tech-spec.md`, `release-checklist.md` |
| QA `Fail` arrow back to execution | Fix slices, reopened artifacts, re-test rounds that keep earlier results | `sdlc-pipeline.md`, `qa.md`, `slices.md`, skills `run-pipeline`, `run-qa` |
| Review conclusion (proceed, with notes, redesign) | Spec gate questions answered with a location, plus a verdict | `tech-spec.md`, section 15 |
| Human review gate prompts | A fixed four-line handoff | Skill `run-pipeline` |
| "One task per context window" | One phase per session, restarted from the files | `sdlc-pipeline.md`, section 7 |
| Prototype: layout and navigation | Navigation line (where a user reaches it, which slice links it) | `tech-spec.md`, section 8 |
| Research: bounded context | "Belongs here, stays out" | `tech-spec.md`, section 2 |
| Research: transactions and race conditions | Transactions and concurrency, naming the mechanism | `tech-spec.md`, section 4 |
| Architecture review: event trigger, failure handling | Two columns in the Events table | `tech-spec.md`, section 2 |
| Architecture review: seed data, CSRF, bundle size | One line each | `tech-spec.md`, sections 4, 9, 10 |
| QA test summary counts | Counts per command; a skip needs a reason | `qa.md`, section 2 |
| Skill `refactor` | Behavior pinned by tests that do not change; limits from the tier triggers | Skill `refactor` |
| Skill `write-test` | Priority from `testing.md`; each test shown able to fail | Skill `add-tests` |
| Skill `create-page` | Thin route, entry point visibility | Skill `add-route` |
| Skill `create-api`, route handler half | Authentication table per caller, from ADR 0012 | Skill `add-server-route` |
| Skill `create-api`: emit events, optimistic updates | Two steps | Skill `add-server-function` |
| Skill `modify-database`: update related code | One step | Skill `add-db-table` |
| "Minor config/env changes" as a small change | Tier S, excluding gate files | `sdlc-pipeline.md`, section 1 |
| Requests routed to skills | Five rows, and what to say to start | `skills.md` |

**Anti-filler standard (new; asked for by the owner, and in neither repo nor reference):** `docs/03-standards/writing.md`, linked from `AGENTS.md`, the DoD, the pipeline, `code-review`, and the writing skills. The reference shows the need: emoji headers, "battle-tested", and tick lists that fit any feature.

### Not adopted

| From the reference | Why |
|---|---|
| 12 phases; prototype and architecture review as phases; docs update as a phase; PRD after architecture | ADR 0005. The reasons still hold |
| `PROMPTS.md` with `Role: …` preambles | A second copy of the skills, which would drift. `skills.md` lists what to say instead |
| `templates/README.md` | The table in `sdlc-pipeline.md` is the catalog. `check-docs` also rejects any template the pipeline does not name, so it would need a link there only to satisfy the check |
| Scaffolding the later artifacts as empty drafts when tasks are approved | `draft` means someone is writing it, and the dispatcher would act on them. Empty files also look like progress. `run-pipeline` now reports the phases still required; a check is in decision AE |
| Agent writes `APPROVED` after the human replies "Approve" | Our rule is stricter on purpose: the reviewer edits the file, so git records who approved |
| `Estimate` per task in minutes | An agent has no basis for it. Size is the 400-line target for one PR |
| 150-line task limit, governance tasks in the task list, kanban sections, summary counts | One slice is one PR. Review and QA are phases, not tasks. The status column holds the board |
| Technical constraints and TypeScript checklists inside the PRD and architecture review | Lint and `AGENTS.md` enforce them. A tick proves less, and it is the filler `writing.md` removes |
| Data model and API design in the PRD | The PRD says what and why; the spec says how |
| `contract.ts`, `_tag`, `ActionResult`, Server Actions, `React.cache`, Prisma, RHF, Zustand, `nuqs`, Pino rule per file, `app/**/page.tsx` | ADR 0006, 0009, 0010, 0011, 0014, 0015 |
| "Core constitution" rule files, `.agents/` layout, `sync-agents.js` | `AGENTS.md` and `docs/` hold these, and one file per agent would drift |
| `docs-update.md` | Docs ship in each PR; the update table is in the DoD; "reviewed and unchanged" is in `learnings.md` |

## Consequences

- **New skills:** `refactor`, `add-tests`, `add-route`, `add-server-route`. `AGENTS.md` and `skills.md` list them. The installer copies them with the rest of `.claude/skills`.
- **Section numbers:** new tech spec and PRD sections were added at the end, so existing citations (sections 8, 11, 12, 13) still hold. The new pipeline text went into sections 1, 4, 5, 7, and 8 and renumbered nothing.
- **Gate review is enforced for `approved` artifacts** since decision AE, with one gate change (below). Whether a note became a change-log row or a ticket is still checked in review.
- ADR 0005 stays as written; this ADR adds the paths back that it left out.

## Decision AE: three checks in `scripts/check-docs.mjs`

**Owner decision (2026-10-31): apply checks 1 and 3; check 2 stays open.** Both make the gate stricter. Changing a check script needs a human (`AGENTS.md`, ADR 0014), which is why the first version of this ADR applied none.

1. **Placeholders:** error when an `approved` or `done` artifact still contains a template placeholder such as `<human>`.
2. **Missing later artifact:** warn when `05-slices.md` is `approved` and no `06-review-log.md` exists after every slice is `merged`, or when the feature stops before `10-learnings.md`.
3. **Gate review:** error when an `approved` artifact has an empty Gate review table.

The first trial, on a copy of the script, is below. Check 2 was not tried.

| Input | Result |
|---|---|
| Real `idea.md` and `prd.md` templates, unfilled, marked `done` and `approved` | Three errors: a placeholder in each, and no approving round in the PRD |
| Filled artifact quoting `Array<string>` in backticks, with an approving round | Clean |
| Text with `3 <5` and `a<b` | Clean |
| `approved` with an empty Gate review table | Error |

Known limit: outside code, `Array<string>` or `<name@example.com>` would be reported as a placeholder, and the author would put it in backticks.

Reading that trial code showed four holes in check 3, none covered by the table above: any approving row passed, even with a later "changes requested"; the word "approve" in the findings counted; one "n/a" anywhere after the heading skipped the check; and removing the section skipped it too.

**As applied:** check 1 reports the line, ignores code, autolinks, emails, and `<br>`, and runs on `approved` and `done` artifacts in `specs/`. Check 3 covers `02-prd.md`, `04-tech-spec.md`, and `08-release.md`, reads only the Verdict column of the table inside the section, and lets the highest round decide. A missing section is an error. A PRD with `Gate: Spec gate` (tier M) is exempt, because its review is in the tech spec. Check 2 needs a rule for features paused on purpose.

Results on fixtures with the applied script (2026-10-31):

| Input | Result |
|---|---|
| Approve; changes requested then "approve with notes"; a later `##` section; tier M PRD with `n/a` | Clean |
| Code, `Array<string>` in backticks, autolink, email, `3 <5`, `a<b`, `<br>`; an unfilled template still `draft` | Clean |
| Approve then changes requested; "not approved" only in the findings; empty table; "n/a" after the section; no section; a table only under another heading; a non-numeric round | Error |
| Unfilled `idea.md` marked `done`; unfilled `tech-spec.md` marked `approved` | Error |

**What it does not do:** it cannot tell who wrote the row (git and code owners answer that), and it does not catch filler text or leftover hint paragraphs. A bare `Array<string>` outside code is reported as a placeholder; put it in backticks. **Effect on existing apps:** after the installer updates the script, an `approved` PRD, tech spec, or release with no Gate review table fails `check:docs` until the table is added. A team-edited script is kept and reported.

## Not verified

- This pipeline on a real feature. ADR 0005's warning stands: expect changes after the first one.
- The new skills in a real app. They point at rules and samples tested under ADR 0010, 0012, 0013, and 0014, and add no API. Their trigger descriptions were read, not run against an agent.
- A chat "approve" being refused in practice: `run-pipeline` asks for it, and nothing enforces it.

## Alternatives considered

- **Copy the 12-phase set in, renamed to the stack.** It reverses ADR 0005, and the reference's templates assume Next.js in most sections. Rejected.
- **Add a `revision` status.** Clear to read, but a change to the check script for something `draft` plus an open review row already says. Rejected.
- **Put the four new procedures in existing skills.** They have different triggers, and `add-server-function` would then hold two opposite answers to "does this need a URL". Separate skills, 20 to 40 lines each.

## Verification

Docs consulted: none for library APIs; none were added. Checked against this repo's `sdlc-pipeline.md`, `check-docs.mjs`, ADR 0005, 0007, 0012, 0013, 0014, and 0015, and the supplied reference files. Date verified: 2026-10-31.
