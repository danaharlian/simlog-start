# Git and Commits

**When to read:** before creating a branch, committing, or opening a PR.

## Branching

- Trunk-based: `main` is always releasable and protected (PR required, CI green, at least one human approval). It deploys automatically to staging only; production is a human deploy (`docs/01-workflow/sdlc-pipeline.md`, section 3).
- Short-lived branches: `<type>/<slug>`, with the commit types below (`feat/`, `fix/`, `refactor/`, `perf/`, `test/`, `docs/`, `chore/`). Lowercase kebab-case, under 50 characters, with no throwaway names (`temp-fix`, `test1`). Slug matches `specs/<slug>/` when applicable. One PR per task means one branch per task: add the task id, e.g. `feat/<slug>-t1`.
- Rebase on `main` before merge; merge strategy: **squash**, with the PR title as the Conventional Commit. Delete the branch after merging.
- Never force-push `main`. Force-push your own feature branch only before review starts.
- **Never bypass hooks** (`--no-verify`). A failing hook is a failing gate (`no-suppression.md`).

## Commits (Conventional Commits)

Format: `<type>(<scope>): <imperative summary>`. Scope is the feature or area (`invoices`, `db`, `deps`). Breaking change: `!` after scope plus a `BREAKING CHANGE:` footer. A PR title follows the same format.

| Type | For |
|---|---|
| `feat` | New behavior for a user |
| `fix` | A bug fix |
| `refactor` | Restructuring with no change in behavior |
| `perf` | A performance improvement |
| `test` | Tests only |
| `docs` | Documentation only |
| `style` | Formatting only, no logic |
| `build`, `ci`, `chore` | Build system, pipeline, and maintenance |

**Summary line:** starts lowercase, uses the imperative (`add`, not `added`), has no final period, and stays under 72 characters.

```text
Good: feat(invoices): add multi-level approval
Good: fix(billing): prevent double payment on slow networks
Good: chore(deps): update drizzle-orm to 1.0.0-rc.5
Bad:  Added some changes.                 (no type, past tense, period)
Bad:  fix: fixed the bug                  (past tense, says nothing)
Bad:  WIP                                 (no type, says nothing)
Bad:  feat(auth): add login and refactor the schema   (two changes)
```

- One logical change per commit, and each commit compiles and passes the gates; one PR per task from `07-tasks.md`.
- Body explains **why**, not what.
- Footer for agent-assisted work: `Docs consulted: <library@version: source>, …` (see rule zero).

## Pull requests

- Small: target ≤ 400 changed lines excluding generated files and migrations. Split otherwise.
- Use `docs/templates/pr-checklist.md` as the PR description template.
- Required in the description: every field of the template (summary, tier and task, link to `specs/<slug>/`, acceptance criteria covered, test-first evidence, `Docs consulted:`, commands run and results, migrations and reversibility, new env vars, new dependencies with ADR, screenshots for UI).
- Reviews: author resolves every comment or replies. A separate review pass (human or fresh-context agent) checks against `docs/01-workflow/definition-of-done.md`.

## Hygiene

- Never commit secrets, `.env`, large binaries, or build output. A leaked secret is rotated, not just removed.
- Generated files: `src/routeTree.gen.ts` is **committed** (ADR 0007, L; the TanStack Router FAQ says to commit it, checked 2026-10-26). Never edit it by hand. It is excluded from lint through `ignores`, never through comments.
- Lockfile is committed; dependency changes appear in their own commit.
