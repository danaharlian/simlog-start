<!-- Use as the PR description template. Delete lines that do not apply, never leave a box checked without verifying. -->

## Summary
<what and why, 2–4 lines>

## Links
- Spec: `specs/<slug>/` · Tier: S | M | L · Task: <id from `07-tasks.md`, or for tier S the link to the issue (`templates/issue.md`)>
- ADR(s): <links or "none">

## Acceptance criteria covered
- <AC and NFR ids from `04-prd.md` that this task satisfies; tier S: the issue's acceptance criteria>

## Test-first evidence (logic and bug fixes)
- Failing run before the change, one line: <test name and failure message>. Exempt (layout, styling, config, docs): say which.

## Docs consulted
- <library@version: source URL>

## Verification (paste results)
- [ ] `typecheck`: <result or "not run: why">
- [ ] `lint` (`--max-warnings 0`): <result>
- [ ] `check:suppressions`, `check:gates`, and `check:ui`: <result>
- [ ] `check` (prettier): <result>
- [ ] `test`: <result>
- [ ] `build`: <result>
- [ ] `node scripts/check-docs.mjs`: <result>

## Changes that need attention
- Migrations: yes/no · reversible: yes/no
- New env vars: <names> (added to `.env.example` and env schema)
- New dependencies: <names + ADR link>
- Suppressions or gate/config weakening: **must be none**. If not none, this PR is blocked until a human approves an ADR (`docs/03-standards/no-suppression.md`)
- `TODO(verify)` left for a human: <none | list>
- Agent corrected by a human (tier S; tiers M and L use `11-learnings.md`): <none | what went wrong, and the guardrail added or the ticket for it>

## Review checklist (see `docs/01-workflow/definition-of-done.md`)
- [ ] Separate-context review pass done (skill `code-review`); round recorded in `08-review-log.md` (tier S: link or summary here): <link>
- [ ] Only files in the task's file list changed (or the change log in `07-tasks.md` was updated first)
- [ ] Architecture boundaries respected; routes thin
- [ ] Server functions validate and authorize
- [ ] Tests cover acceptance criteria and failure paths
- [ ] Docs/ADRs updated

## Screenshots (UI changes)
