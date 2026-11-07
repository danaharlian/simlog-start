---
name: write-prd
description: Draft a Product Requirements Document (pipeline phase 4) from a captured idea. Use when the user asks for a PRD, requirements, or to turn an idea into a spec-ready brief. Produces specs/<slug>/04-prd.md for the human PRD gate.
---

# Write a PRD

Pipeline phase 4. Inputs: `specs/<slug>/01-idea.md` (problem, discovery notes, tier), `02-research.md`, and `03-prototype.md` if present. Architecture comes **after** the PRD, so do not design the solution here. If the idea file is missing, or tier L has no research, say so and ask; do not invent them.

## Steps

1. Read the inputs and `docs/01-workflow/sdlc-pipeline.md` (phases 4 and 6). Check that `01-idea.md` has a confirmed tier and its decision is to proceed, and fill the `Research:` and `Prototype:` lines, with the reason for a skip; if not, stop and ask. A requirement that rests only on a prototype says so. Carry its open questions and assumptions into the PRD instead of dropping them.
2. Ask up to 5 clarifying questions only for things that change scope or acceptance (roles and permissions, must-have versus nice-to-have, success metric and baseline, sensitive data, rollback expectations). If the person is unavailable, proceed and list each unanswered point in "Open questions and risks".
3. Copy `docs/templates/prd.md` to `specs/<slug>/04-prd.md`. Fill every section, or write `n/a: <reason>`. Tier M: the minimum sections named in the template (one page). Tier S needs no PRD (acceptance criteria go in the issue).
4. Describe **what and why**, never how: no tables, endpoints, server functions, components, or library choices. Do not copy repo-wide engineering rules into the PRD; they live in `AGENTS.md`.
5. Chain the ids so nothing is lost: stories `US#` → requirements `R#` (functional) and `NFR#` (measurable, with a verification) → acceptance criteria `AC#`. Every Must requirement and every NFR is covered by at least one AC, and each AC says what it covers. Edge cases `EC#` each become an AC or are marked "not needed" with a reason.
6. Write acceptance criteria as Given/When/Then. The feature spec maps each id to a test and the execution loop writes those tests first. Ask the person who will test to review them.
7. Metrics: give each a baseline (or "Unknown" and how it will be captured before release), a target, a window, a data source (or "none yet"), and an owner. Never invent a number.
8. Fill permissions and sensitive data (classification, retention, deletion) or write `n/a: no sensitive data`. Fill release and regression expectations, including the rollback trigger and its owner. Do not guess owners; leave them as open questions.
9. Mark every unconfirmed fact as **Assumption** with an owner. Never present a guess as a requirement.
10. Complete the "Gate readiness" table last. Self-check: could a different engineer build the right thing from this alone? Is every requirement testable? Are non-goals explicit?

Before handing over, check the text against `docs/03-standards/writing.md`.

## Output

The PRD file path and a short list of open questions for the human. Set the status to `in review` when you hand it over and `Gate:` to `PRD gate` (tier M: `Spec gate`). `approved` follows the approval rule (`docs/01-workflow/sdlc-pipeline.md`, section 4). Statuses: `docs/01-workflow/sdlc-pipeline.md` section 8.
