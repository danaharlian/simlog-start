---
name: build-task
description: Build one task of an approved task breakdown (pipeline phase 8): tests first from the acceptance criteria, implement, run the gates, review, and open one PR. Use for every task after the Tasks gate (tier M: the Spec gate), and for tier S issues. Not for planning.
---

# Build one task

Pipeline phase 8, one task = one PR. A tier S defect goes through `fix-bug`, which ends in these same steps. Inputs: the task's block in `07-tasks.md` and the spec it points to (tier S: the issue). If the task breakdown or spec is missing or not approved, stop and ask. Read `docs/01-workflow/sdlc-pipeline.md` section 3 and `definition-of-done.md`.

## Steps

1. Create the branch `feat/<slug>-<task-id>` (`docs/03-standards/git-and-commits.md`). Set the task to `in progress` in `07-tasks.md`.
2. Read the task's "Read first" list. For every library call you will write, run `verify-library-docs` and keep the `Docs consulted` lines.
3. **Tests first** (logic, schemas, services, server functions, every bug fix): write them from the task's acceptance criteria, run them, confirm they **fail on an assertion, not on a missing import**. Keep the one-line failing result for the PR. Exempt: layout, styling, config, docs.
4. Implement until green, then refactor. Use the matching skills: `new-feature` (first task only), `add-db-table`, `add-server-function`. Change **only files in the task's file list**; a needed extra file goes into the change log in `07-tasks.md` first. If the spec turns out wrong, stop and change it through its change log and gate (`sdlc-pipeline.md` section 6), not silently in code.
5. Run the gates and keep the real output: `typecheck`, `lint`, `check:suppressions`, `check:gates`, `check:ui`, `check`, tests, `build`, `node scripts/check-docs.mjs`. A missing script is reported, not invented. Never fix a failure with a suppression, a cast, a skipped test, or an edit to lint or TypeScript config (`docs/03-standards/no-suppression.md`); blocked means stop and ask.
6. Update in the same PR: feature `README.md` (public API, events, owned tables), `docs/`, ADRs, `.env.example`.
7. Open the PR with `docs/templates/pr-checklist.md` fully filled. Set the task to `in review` with the PR link.
8. Review: run skill `code-review` in a fresh context, fix blocking findings, and record each round in `08-review-log.md` (tier M and L). The PR gate is a human's.
9. After merge, the next task's PR sets this one to `merged`.

## Output
The PR link, the test-first evidence, commands run with results, and anything left as `TODO(verify)`.
