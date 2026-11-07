# Review Log: <Feature name>

- Slug: `<feature-slug>` (file `08-review-log.md`)
- Task Breakdown: `07-tasks.md`
- Status: draft | done
- Decided by: <name> (Tech Lead), <date> — format and authority: `docs/01-workflow/roles.md`
- Gate: PR gate (one per task, see below)
- Tier: M | L (tier S: the PR is the record, no file)

One entry per review round of one task, appended **in that task's PR** (the author adds it before merge, so the merged file holds the final state). Never review several tasks in one batch at the end: the PR gate is per task. Findings come from the `code-review` skill output (`.claude/skills/code-review/SKILL.md`) and from the human reviewer. This file is the durable record of the **PR gate**; the discussion stays in the PR. Every round needs a human reviewer: an agent's review is an input, not the approval (`docs/01-workflow/roles.md`). `Decided by:` is filled when every task is merged, by the Tech Lead.

Tier M: one short entry per task (verdict, and the findings table only if there were findings). Tier L: full entries.

Severity: **Blocking** (security, data loss including a race, auth gap, hallucinated, removed, or deprecated API, boundary violation, any suppression or weakened gate, a failed acceptance criterion) · **Non-blocking** (suggestion). A blocking finding is resolved before the gate passes. A non-blocking one is fixed, or declined with a reason by the author and accepted by the reviewer.

## T1: <task outcome>

### Round 1: YYYY-MM-DD
- **PR:** <link> · **Commit reviewed:** <sha>
- **Review passes:** separate-context pass (`code-review`): <who or which agent run, link to its output> · human review: <name>
- **Verdict:** approve | request changes | blocked (needs a human decision)

| ID | File:line | Review pass (1 to 9 in `code-review`) | Severity | Finding | Resolution (fixed in <sha> · declined: reason · accepted by <name>) | Status (open · resolved) |
|---|---|---|---|---|---|---|
| R1-1 | | | | | | |

**Unverified** (claims or APIs the reviewer could not check): <none, or list, with the person who will check>.

**Decisions made in review** (design adjustments, accepted trade-offs): <none, or list>. A decision that changes the spec or task breakdown is also recorded in that file's change log; one that is architectural gets an ADR (links here).

**Outcome:** <all blocking findings resolved: yes / no> · PR gate passed by <name>, <date> (with the approval source from `docs/01-workflow/sdlc-pipeline.md`, section 4), or "not yet".

### Round 2: YYYY-MM-DD
Same fields. Re-review only what changed since the previous round, and check that each blocking finding is resolved.

## T2: <task outcome>
Repeat.
