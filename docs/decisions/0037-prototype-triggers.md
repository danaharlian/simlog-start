# 0037 Prototype triggers and a first task that proves open assumptions

- Status: accepted
- Date: 2026-11-07
- Deciders: owner, via chat, 2026-11-07: "kerjakan", in reply to the proposal to replace the "risky hypothesis" judgement with checkable prototype triggers and to have the first task prove the assumptions that remain. The wording below is the agent's and can be reversed by a new ADR
- Extends: ADR 0017 (pipeline order), which made the prototype conditional

## Context

Phases 1, 2, 4, 5, 6, and 7 produce documents. The only phase before phase 8 that runs code is the prototype, and it ran only for a "risky hypothesis". Who judged the risk was the agent writing research, and nothing let a reviewer check that judgement: section 5 of `02-research.md` could say "none" with no evidence.

Research verifies each library API on its own, against the installed version. That does not show the parts work together. A Better Auth session, a server function, and a Drizzle transaction can each match their docs and still fail in one request. When research said "none", the first code that combined them ran in phase 8, after the PRD, the feature spec, and the task breakdown were approved. A wrong assumption then had to be undone through three change logs.

The owner asked whether checking feasibility only during the task build was a gap. This ADR is the change they approved.

## Decision

1. **Section 5 of `02-research.md` is a checklist of four triggers**, each answered yes or no with evidence:
   - P1: two or more libraries the feature needs are not yet used together in `src/`.
   - P2: a finding the design will rest on is labelled Inferred or Unknown.
   - P3: the idea states a time or volume expectation no code in `src/` is known to meet.
   - P4: a flow or layout a person must judge has not been seen.
2. **One yes means a prototype, and unsure counts as yes.** This is the same rule as the tier. Section 5 is now part of the tier M minimum of the research template.
3. **Only a human skips a prototype when a trigger is hit.** The PRD's `Prototype:` line records who and when. With no trigger hit, the line says the triggers were checked.
4. **Libraries not yet used together in `src/` are an unknown about the stack**, so tier M cannot skip research for them (skill `run-pipeline`).
5. **The first task proves what no code has proven yet.** In the task breakdown, T1 names one test for each Inferred research finding the spec relies on and for each section 5 hypothesis no prototype tested. If one fails, the build stops and the spec changes first. The Tasks gate review asks for it.

Changed: `docs/templates/research.md`, `prd.md`, `prototype.md`, `tasks.md`; `docs/01-workflow/sdlc-pipeline.md` (tier table, phase table, diagram, rules 2 and 5, a paragraph on what runs code before phase 8); skills `write-research`, `write-prototype`, `run-pipeline`, `write-tasks`.

## Consequences

- **Feasibility problems surface before the PRD.** A combination that does not work is found in a prototype, while only `02-research.md` has to change.
- **The skip decision can be reviewed.** A reviewer checks four answers with evidence, not a claim that nothing is risky.
- **Cost: more prototypes, mostly early.** In a new app almost every combination is new to `src/`, so P1 is hit often. The time-box agreed in skill `write-prototype` step 2 limits each one, and P1 is hit less as `src/` grows.
- **Risk: answers given without looking.** An agent can still write "no" for P1 without searching. The evidence column asks for the file that already combines the libraries, and review checks it. No script checks it.
- **Limit: the triggers are a list.** A risk outside P1 to P4 is still caught only by judgement. Unsure counts as yes, and phase 11 is where a missed kind of risk becomes a fifth trigger.
- **No check change.** `scripts/check-docs.mjs` reads headers and statuses, not section 5 or the PRD's `Prototype:` text, so it needs no change.

## Not verified

- **On a real feature.** No `specs/` folder has used the checklist yet. How often P1 is hit, and how long the prototypes take, is Unknown until one does.

## Alternatives considered

- **Keep the judgement and remind the agent to be careful.** The gap is that the judgement cannot be reviewed; a reminder does not change that. Rejected.
- **Always prototype in tier M and L.** It closes the gap but costs a spike on features whose every part already runs together in `src/`. Rejected.
- **Typecheck a sketch of the contracts before the Spec gate.** A prototype already runs the contracts when a trigger is hit, and T1 runs them end to end otherwise. It would add a step and catch nothing new. Rejected.

## Verification

n/a for library docs: this changes pipeline documents only, and no library API is involved.

Run on 2026-11-07 on macOS:
- `node scripts/check-docs.mjs`: 149 files, 0 errors. The 21 warnings are line budgets in third-party skills this change does not touch.
- `node --test scripts/test-gates.mjs`: 137 of 137 pass.
