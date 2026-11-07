# 0019 Tier consistency, unknown artifact files, chat quotes, and a kept test for the check

- Status: accepted
- Date: 2026-10-31
- Deciders: owner (approved the four recommendations, including the changes to `scripts/check-docs.mjs`)
- Extends: ADR 0017, ADR 0018

## Context

ADR 0018 listed what the checks could not do. Four of those gaps were cheap to narrow:

1. **The test matrix was a throwaway script,** and `check-docs.mjs` had changed three times in one day.
2. **A misstated tier avoided the tier L rules:** each artifact declared its own `Tier:`, nothing compared them, and an artifact with no `Tier:` line was not treated as tier L.
3. **A file with an older name was skipped silently,** so an upgraded app's approved artifacts simply left the status checks.
4. **A `via chat` approval left nothing to read later.**

## Decision

1. **`scripts/test-check-docs.mjs` keeps the matrix.** It needs only Node, builds specs from the real templates, and stays in this repo; the installer does not copy it. A new rule gets a case.
2. **`01-idea.md` holds the tier** in a `Tier:` header, `M` or `L`. Tier S has no `specs/` folder. The tier L rules read the idea, and a `Tier:` or `Tier after research:` line in a submitted artifact must match it. A draft is not compared, so a tier can change while work is open.
3. **A numbered file in `specs/<slug>/` must be a known artifact.** Other files, such as notes, are left alone.
4. **`via chat` needs a quote** in the findings of the last Gate review round.

## Consequences

- **All four only make the check stricter.** No rule was removed.
- **A consistent lie still passes.** `Tier: M` everywhere, on a feature with an L trigger, is not caught: only a human can see the trigger. The check now forces the claim to be made once and kept.
- **A quote is checked for existence, not meaning.** `"OK"` passes the check, and a reader can see it and reject it.
- **A tier M PRD approved `via chat` has no table of its own,** so its quote is read only from the feature spec's review, by a person.
- **Existing apps** need the new `Tier:` line, and their files renamed; `README.md` says how. The rename table stays in ADR 0017, because any old name in `README.md` itself fails the check.
- **Nothing runs the test automatically.** This folder has no git repository and no CI of its own. A workflow was not added: it would need a host and action versions this repo has not verified (rule zero). `README.md` gives the command.

## Not verified

- The test on Windows: it reads its own path from `import.meta.url` as `check-docs.mjs` does, which was only run on macOS (Node 24).
- These rules on a real feature.

## Alternatives considered

- **Warn instead of error on an unknown file.** A warning does not fail CI, and the file would stay outside the status checks.
- **Check the idea's trigger list against the tier.** Triggers are prose, so it would be a guess.
- **Require the quote to name the artifact.** The rule wants that, but real messages say "approve the PRD" as often as a file name. A wrong rejection teaches people to reword their approvals.
- **Put the rename table in `README.md` with an exception.** A second exception to protect one table; a pointer does the job.

## Verification

Docs consulted: none. `node:test` was used and run on the installed Node 24.22.1, and no API was added to the app's stack. Results on 2026-10-31:

| Run | Result |
|---|---|
| `node --test scripts/test-check-docs.mjs` on this repo | 51 tests, 51 passed, 0 skipped |
| `node scripts/check-docs.mjs` on this repo | 0 errors, 0 warnings |
| The test against eight copies of the script, each with one rule removed or weakened | All eight failed, on the cases for that rule |

The eight: the `via chat` quote; tier match; the tier read from the idea; the unknown-file error; agent names in `Approved by:`; the ADR exception widened back to all of `docs/decisions/`; tier M tasks exempt again; the first approving round winning over the last.
