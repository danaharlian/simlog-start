# 0022 Gate holes after ADR 0021, and installer cleanup

- Status: accepted
- Date: 2026-10-31
- Deciders: owner approved all items ("kerjakan semua") and asked for the `check:docs` failure on a real project to be fixed
- Extends: ADR 0014, ADR 0021

## Context

A review of ADR 0021's gates, run in a Start app, found holes. Separately, the owner ran the installer on a real project, `simbah-new`, and `check:docs` failed with 9 errors.

1. **`check:gates` passed with `'boundaries/dependencies': 'off'`.** One line could turn off every architecture rule. `linting-and-formatting.md` also claimed the script guarded the `shared/db/` rule: that sentence, written for ADR 0021, was false.
2. **`shared/db/client` could still be imported** from `shared/ui`, `shared/lib`, a feature's `index.ts`, and any file outside a boundary category (`utils/`, `server/helper.ts`). The first three can reach the client bundle.
3. **`console.*` passed in `src/routes/api/`,** while `AGENTS.md` said lint rejects it in server code.
4. **The `check:docs` failure came from empty folders.** `.claude/skills/build-slice`, `write-slices`, and `write-tech-spec` were empty, with names from before ADR 0017. The project was at its initial commit with 41 empty folders left behind, so `git status` was clean: git does not track empty folders. Each folder gave three errors, so three folders gave 9.
5. **The installer only ever added files.** A skill renamed by a later version stayed in the app.
6. **`check-docs` read every entry in `.claude/skills`,** so a macOS `.DS_Store` there would have been reported as a skill with no `SKILL.md`.
7. **The installer's "gates" left out `check`, `test`, and `build`,** which the Definition of Done requires. It could print PASS on every line while `check` failed, as it did under ADR 0021.
8. **The gates had no kept tests.** ADR 0021's cases lived in a scratch folder.

## Decision

- **`check-lint-integrity.mjs`** requires `boundaries/dependencies` as an error on every file, with `default: 'disallow'`, `checkInternals: true`, and its `shared-db` rules. It also rejects a file in a feature that matches no boundary category, using `FEATURE_FILE`.
- **`eslint.boundaries.js`** adds a `client-reachable` category (`shared/ui`, `shared/lib`, `shared/hooks`, a feature's `schemas.ts`). That category, `public`, `errors`, and `events` join `ui` in the rule denying `shared-db`.
- **`eslint.code-rules.js`:** `no-console` also covers `src/routes/api/**` and `src/**/*.server.{ts,tsx}`.
- **`install.mjs`** gets `pruneStale`. A file in the manifest that this version does not ship is removed if unchanged, and reported if edited. An empty skill folder that this version does not ship is removed, also with only a `.DS_Store` inside. A skill folder with other files is never touched.
- **The installer's gates** are now `check`, `lint`, `typecheck`, `test`, and the three `check:*`. A missing script prints `SKIP`. `build` stays with CI, because it is slow and the rest catch most failures first.
- **`check-docs`** reads folders only. A missing `SKILL.md` stays an error, now says what to do, and no longer repeats as "not listed".
- **`scripts/test-gates.mjs`** keeps the cases: 22 rejected, the allowed set, 10 weakenings, 3 uncategorized files, and 5 installer cases. It is not copied to apps.

## Consequences

- **Stricter for existing apps:** a feature with `utils/`, `types.ts`, or `server/helper.ts` now fails `check:gates` until the file moves. `shared/lib` importing `shared/db/` fails `lint`. An app whose code is not Prettier-clean now shows FAIL at install, and the installer exits 1, where it used to pass.
- **The installer now deletes files.** It deletes only what its manifest proves it wrote, unchanged, and what `--dry-run` lists first.
- **A real bug this caught:** the first `pruneStale` removed `.mcp.json` on the second run, because that file is placed only on the first. A test in `test-gates.mjs` found it before any app did. `.mcp.json` and `.github/CODEOWNERS` are exempt by name, so **a new file placed only on the first run must be added to `placedOnce`.**
- `FEATURE_FILE` repeats `boundaries/files` by hand, and a new folder has to change both. `test-gates.mjs` covers three wrong paths and the standard files it uses, not every folder.

## Results

Run on 2026-10-31 with Node 24 and pnpm 12.16.

| Run | Result |
|---|---|
| `node --test scripts/test-gates.mjs` | 20 of 20 passed |
| `node --test scripts/test-check-docs.mjs` | 75 of 75 passed |
| `node scripts/check-docs.mjs` in this repo | 0 errors, 0 warnings |

**A copy of `simbah-new`, with its empty folders, using the owner's exact options:** 3 folders removed, 124 files created, 7 of 7 gates passed, `build` passed, `preview` answered 200 on `/`. A second run: 130 unchanged, nothing removed. The real project was not changed.

**The Start app from ADR 0021, with a feature and 14 primitives:** 7 of 7 gates and `build` passed. `preview`: `/` and `/invoices` 200, `/api/health` 200, `/api/invoices` 404 as designed.

## Not verified

- The owner's real project: only a copy was run. It holds a scaffold and no feature code of its own, so nothing there tests the stricter rules against real features.
- A policy loosened inside `eslint.boundaries.js`: `check:gates` sees only the three settings above, so code owners review the rest.
- Removal of a stale file on a real upgrade from a version before ADR 0017. Tests used a hand-written manifest entry.
- A CI run, and `test-gates.mjs` on Linux or Windows. The script assumes `pnpm` and `bash` on `PATH`.
- Why the owner's install ended up reverted: the state was observed; how it got there was not asked.

## Alternatives considered

- **Have `check-docs` ignore empty folders.** It would hide the state rather than clean it, and it would weaken a check. Rejected: the installer removes them, and a run without the installer still gets a clear error.
- **Delete the three folders in the owner's project by hand.** It would fix one machine and leave the bug. Rejected.
- **Add a boundary policy for uncategorized feature files.** A `noneOf` filter did not match a file with no category (ADR 0021), so a plain path check in `check-lint-integrity.mjs` was simpler.
- **Add `build` to the installer's gates.** Rejected as slow; the owner's list is still fully run in the results above.

## Verification

Docs consulted: none for library APIs; none were added. `boundaries/dependencies` options come from the existing `eslint.boundaries.js` and the runs above. `eslint-plugin-boundaries` 7.2.0 and ESLint 10.13: behavior through those runs. Date verified: 2026-10-31.
