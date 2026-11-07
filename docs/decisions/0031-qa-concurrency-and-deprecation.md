# 0031 QA and review check races and deprecation

- Status: accepted
- Date: 2026-11-06
- Deciders: owner asked for a concurrency or race check and for zero deprecated API usage, after comparing a reference `PIPELINE.md`; where each check sits is the agent's choice and can be reversed by a new ADR
- Extends: ADR 0016, ADR 0017

## Context

The owner supplied a reference `PIPELINE.md`, similar to the one compared in ADR 0016. Its QA phase runs a "real-DB concurrency probe" and asks for "zero deprecation warnings or diagnostics". Its review also asks for zero deprecated API usage. The rest of it was already decided in ADR 0016 and 0017 and was not adopted again.

Read in this repo on 2026-11-06:

- **Races are designed but not tested end to end.** The feature spec, section 4, "Transactions and concurrency", names each collision point and its mechanism. The DoD names "concurrent update" as an edge case. `templates/qa.md`, `run-qa`, and `code-review` did not mention concurrency or races. No step checked that the mechanism holds when two writes really run together.
- **Deprecation is caught in types only.** `@typescript-eslint/no-deprecated` (`eslint.no-suppress.js`) flags a call marked `@deprecated` in the installed types. Nothing read the warnings a library prints at run time, and the DoD, QA template, and review had no line for them.

## Decision

1. **Concurrency.** Each collision point in the feature spec, section 4, is tested by running the colliding writes together against a real PostgreSQL database and checking the stored data:
   - in the task that builds it (DoD, and `code-review` pass 4);
   - in QA when section 1 says it is required, which it is whenever the spec names a collision point (new subsection in `qa.md` section 7, and `run-qa`).
   A lost update, duplicate row, or partial write is Critical in QA and blocking in review.
2. **Zero deprecated API usage.** `lint` stays the check for types. The DoD, `code-review` pass 1, `qa.md` section 2, and `run-qa` also read the `test` and `build` output (and, in QA, the staging server log and the browser console) for deprecation warnings. The count must be 0. A deprecated API is blocking in review and a High defect in QA, which blocks the release.

Changed: `docs/templates/qa.md`, `docs/templates/review-log.md`, `docs/01-workflow/definition-of-done.md`, `docs/01-workflow/sdlc-pipeline.md` (QA row), skills `code-review` and `run-qa`.

## Consequences

- **A release can be blocked by a third-party warning.** A library may print a deprecation warning the feature cannot remove. The QA template allows a Medium or Low defect to be accepted with a named human and a ticket, not a High one. If this happens, a new ADR decides whether such a warning may be accepted.
- **Concurrency tests need a real database.** `testing.md` already requires one for persistence; no new tool is added.
- **No check enforces either rule.** `check-docs` reads headers and gate tables, not the contents of a QA section. Review and the Release gate check them.

## Not verified

- The run-time deprecation check on a real feature: no feature has run on this pipeline yet.
- That every library in the stack prints its deprecations at run time. Some only mark them in types or docs, which is why pass 1 also reads the docs for the installed version.

## Alternatives considered

- **A script that fails CI on a deprecation warning in the test output.** It would enforce rule 2, but changing CI or adding a `check:*` script needs a human (`AGENTS.md`), and the warning format differs per library. Left for later, if review misses one.
- **A separate QA section for concurrency.** It would renumber sections 8 to 10, which `sdlc-pipeline.md` and `run-qa` cite. A subsection of section 7 keeps the numbers.

## Verification

No library API was added. Repo files read on 2026-11-06: `docs/templates/qa.md`, `docs/templates/feature-spec.md` section 4, `docs/03-standards/linting-and-formatting.md`, `docs/03-standards/no-suppression.md`, `docs/examples/eslint.no-suppress.js`, skills `code-review` and `run-qa`.
