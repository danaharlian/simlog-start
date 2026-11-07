<!-- Tier S issue: paste as the issue body. It is the whole plan for a small change, so keep it short. Tracker choice is not decided; the template is plain Markdown. -->

# <Short title: the observable problem or the one change>

## Tier check (required, a human confirms)
Tier S applies only when **none** of these is true (`docs/01-workflow/sdlc-pipeline.md`). Tick what applies; any tick raises the tier to M or L.
- [ ] auth, permissions, or sessions
- [ ] personal or payment data
- [ ] a migration or backfill
- [ ] a new dependency
- [ ] a change to a contract other code relies on (public API, server function shape, event)
- [ ] a performance-sensitive path
- [ ] an operation that cannot be undone

Tier: S · Confirmed by: <human>, <date>. (Not S: start at `docs/templates/idea.md`.)

## Problem
What happens now, what should happen, and how to reproduce it (a bug) or why it matters (a tweak). Observable behavior, not a solution. Evidence: <ticket, log, screenshot, or "Unknown">.

## Acceptance criteria
Given/When/Then, at least one. These become the tests.
- AC1: Given … When … Then …

## Test plan
- Test written first, from AC1 (a bug fix: a regression test that fails for the reported reason before the fix): <name and file>. Exempt (layout, styling, config): say why.
- Other tests that must stay green: <names, or "existing suite">.

## Scope
- Files or areas likely touched: <list>. The PR stays within them; widen this list here first.
- Not doing: <one line>.

## Release and rollback
Normal deploy. Rollback = revert the PR. Anything that makes this untrue is a risk trigger: re-check the tier.

## Done when
The PR template is filled (`docs/templates/pr-checklist.md`), the AC tests pass, and the Definition of Done holds (`docs/01-workflow/definition-of-done.md`). If a human had to correct the agent, the PR says what and which guardrail was added.
