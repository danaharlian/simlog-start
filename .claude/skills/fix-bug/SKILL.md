---
name: fix-bug
description: Fix a bug as a tier S change - reproduce it, find the root cause, write a failing regression test first, make the smallest fix, run all gates. Use when a defect is reported and no risk trigger applies. Not for new behavior, and not when the fix needs a migration, a contract change, or auth changes (those are tier M or L).
---

# Fix a bug (tier S)

Pipeline tier S: issue, one PR, one gate (`docs/01-workflow/sdlc-pipeline.md` section 1). Read `docs/templates/issue.md` and `docs/03-standards/testing.md`. The mechanics of branch, gates, and PR are those of `build-task` (steps 5 to 7); this skill adds what a bug needs: a reproduction, a cause, and a test that fails first.

## Steps

1. **Issue.** Use the tier S issue (`docs/templates/issue.md`). No issue yet: draft it from the report. Tick the risk triggers honestly; any tick means stop and go to `run-pipeline` as tier M or L. A human confirms the tier.
2. **Reproduce before touching code.** Write the exact steps, the observed result, and the expected result. Use the real error, log line, or failing input. Cannot reproduce: stop, report **Unknown** with what you tried. Never fix a bug you have not seen.
3. **Find the cause, not the symptom.** Name the layer where the behavior goes wrong (UI, query, server function, service, repository, schema; `docs/02-architecture/modular-monolith.md`). One sentence in the issue: "Cause: X in <file>, because Y". If the cause involves a library call, run `verify-library-docs` before concluding the library is at fault.
4. **Regression test first**, at the lowest layer that shows the defect. Run it and confirm it fails **on an assertion for the reported reason**, not on a missing import. Keep the one-line failing output for the PR. Exempt only pure layout or styling: say so in the issue.
5. **Smallest fix.** Branch `fix/<slug>`. Change only the files in the issue's scope; widen the scope in the issue first. No refactoring, renaming, or "while I am here" edits: those are other changes. Never use `any`, a cast, `eslint-disable`, `@ts-*`, a skipped test, or a config edit to get green (`docs/03-standards/no-suppression.md`).
6. **Green and gates.** The regression test passes; run the same gates as `build-task` step 5 and keep the real output.
7. **Same defect elsewhere.** Search for the same pattern (same call, same missing check). Report each hit. Fix a hit only if it is inside the issue's scope; otherwise open a ticket.
8. **Tier re-check.** The fix turned out to need a migration, a changed contract, a permission change, or a new dependency: stop. The issue becomes `01-idea.md` at tier M or L.
9. **PR.** `docs/templates/pr-checklist.md` filled: failing output before, passing output after, `Docs consulted:`, the cause line. A human corrected you, or the bug was a repeated mistake: add the one-line learning (phase 11, tier S). Update docs if the bug showed one was wrong.

## Output

The issue and PR links, the cause in one sentence, the failing and passing test output, similar defects found, and anything left as `TODO(verify)`.
