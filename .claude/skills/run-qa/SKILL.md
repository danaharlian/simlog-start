---
name: run-qa
description: Check the assembled feature on staging against the PRD and record the result per acceptance criterion with evidence (pipeline phase 9). Use after every task has passed its PR gate. Produces 09-qa.md for the Release gate.
---

# Run QA

Pipeline phase 9. Output: `specs/<slug>/09-qa.md` from `docs/templates/qa.md`. Tier S has no file; the PR carries the evidence. Inputs: `04-prd.md` (AC, EC, roles, regression journeys, NFRs), `06-feature-spec.md` section 11, `08-review-log.md`.

## Steps

1. Confirm every task in `07-tasks.md` is merged and has a passed round in the review log. If not, stop.
2. Record the environment: staging, the build or commit id, and the data used (seeded or factory data, never production data).
3. Fill section 1: which checks are required here, from the tier, the risk triggers, and the PRD's NFRs. Do not skip a required one; write "not run: <reason>" instead.
4. Run the automated commands against this build and paste real results (`test`, the end-to-end suite if any, `build`, `lint`, services coverage). Never write "pass" for something you did not run. Count the deprecation warnings in the `test` and `build` output, the staging server log, and the browser console during the walks: the count must be 0, and each warning is a High defect.
5. Walk **every AC and EC** from the PRD. For each, record where the result comes from (a named automated test, or a manual walk on staging), the result (pass, fail, not run) and evidence (output, link, screenshot).
6. Permission matrix: test each "can" and "cannot" per role on staging, including signed out and another tenant's data. A "cannot" must be refused by the server function.
7. Walk the PRD's regression journeys, accessibility (the PRD's NFR; no repo default level yet), responsive and theme checks, and performance against NFR targets. With no tool or target, the result is **Unknown**, never a guess.
   Concurrency: for each collision point in the feature spec, section 4, "Transactions and concurrency", start the colliding operations at the same time against a real database (an integration test, or two sessions on staging) and check the stored data. A lost update, duplicate row, or partial write is Critical.
8. Log each defect with severity, steps, the AC or EC, and the task. Critical, High, or a failed Must criterion is blocking. A fix is re-tested and gets a regression test.
9. Fill the result for the Release gate. You record; a human accepts. Never mark the feature approved yourself.

## Output
The file path, the overall result, blocking items, and criteria not run. Set `Result:` to `pass` (also for "pass with accepted risks") or `fail` when every row has a result, then stop: `done` needs `Decided by:` from the QA Lead and the Product Owner, one for quality and one for acceptance. Keep `Result: pending` and `draft` until then. On `fail`, report the blocking defects and stop: `run-pipeline` starts the fix tasks. On a re-run, test the affected criteria and the regression journeys, and add a round to section 8 instead of overwriting results.
