# PRD: <Feature name>

- Slug: `<feature-slug>` (folder `specs/<feature-slug>/`, file `04-prd.md`)
- Idea: `01-idea.md` (decision: proceed)
- Research: `02-research.md` | skipped: <reason; tier M only, when there are no unknowns>
- Prototype: `03-prototype.md` | skipped: <reason: no risky hypothesis>
- Status: draft | in review | approved | dropped
- Gate: PRD gate | Spec gate (tier M: approved together with the feature spec)
- Tier: S | M | L (from `01-idea.md`)
- Owner: <product owner>
- Author: <human, or "AI agent">
- Reviewers: <names or roles: product owner, tech lead; add QA for the acceptance criteria>
- Date: YYYY-MM-DD
- Approved by: <name> (Product Owner or Business Sponsor), <date> — format and authority: `docs/01-workflow/roles.md`

The PRD says **what and why**, in terms the user and the business see. It does not say how: no tables, endpoints, server functions, components, or library choices. Those belong to the feature spec. Repo-wide engineering rules (architecture, TypeScript, testing) are not repeated here; they live in `AGENTS.md` and `docs/03-standards/`.

Tier M minimum (one page): sections 1, 2, 3, 4, 6, 9. Write "n/a" in the rest (tier M records its review in the feature spec, section 15). Tier L: all sections.

## Gate readiness
Every line is filled with a pointer to the section, or says `n/a: <reason>`. A reviewer can approve only when none is empty.

| Item | Where | Ready |
|---|---|---|
| Problem and target user | section 2 | |
| Priority, rationale, and decision owner | section 2 | |
| Success metric with baseline, target, window, and owner | section 3 | |
| Scope and non-goals | section 4 | |
| Roles and permissions | section 7 | |
| Sensitive data: classification, retention, deletion | section 7 | |
| Acceptance criteria cover every Must requirement | section 9 | |
| Release and regression expectations, rollback trigger and owner | section 11 | |

## 1. Summary
Two to four lines: what is being built, for whom, and why now.

## 2. Problem, priority, and rationale
**Problem:** who has it and what happens today (from `01-idea.md`; no solution language). **Evidence:** <source>.
**Priority:** <framework used, e.g. MoSCoW or impact versus effort> · **Expected impact:** <user or business> · **Decision owner:** <name or role> · **Why now:** <reason or deadline>.

## 3. Goals and success metrics
| Metric | Baseline (current value, or "Unknown") | Target | Measurement window | Data source (or "none yet") | Owner |
|---|---|---|---|---|---|

If a baseline is Unknown, say how it will be captured before release; otherwise the Measure phase can report only an absolute value. The Measure phase checks this table after release.

## 4. Scope
**In scope:** the capabilities this PRD commits to.
**Non-goals:** deferred or explicitly excluded.

## 5. Users and stories
Roles involved and 3 to 5 primary stories. Key flows and screens: names and links to designs only; component structure belongs to the feature spec.

| ID | As a (role) | I want to | So that | Priority (Must / Should / Could) |
|---|---|---|---|---|
| US1 | | | | |

## 6. Requirements
**Functional** (testable, numbered; every Must needs an acceptance criterion in section 9):

| ID | Requirement | Story | Priority |
|---|---|---|---|
| R1 | | US1 | Must |

**Non-functional** (a measurable target and how it will be verified; tools are not decided here):

| ID | Category (performance · security · accessibility · reliability · privacy · observability) | Target | Verification (automated test · measurement · manual check · audit) |
|---|---|---|---|
| NFR1 | | | |

## 7. Permissions and data
**Roles and permissions** (what each role can and cannot do, and its data scope; the feature spec decides how it is enforced):

| Role | Can | Cannot | Data scope |
|---|---|---|---|

**Sensitive data** (leave empty only with `n/a: no sensitive data`):

| Data | Classification | Retention period | Deletion or anonymization path | Who may access |
|---|---|---|---|---|

## 8. Edge cases and error scenarios
Expected behavior as the user sees it. Each one becomes an acceptance criterion in section 9, or is marked "not needed" with a reason.

| ID | Scenario | Expected behavior | Becomes |
|---|---|---|---|
| EC1 | | | AC? |

## 9. Acceptance criteria
Given/When/Then statements, each with an id and the requirement it covers. They become the tests: the feature spec maps every id to a test, the task breakdown assigns every id to a task, and the execution loop writes those tests first. Cover every Must requirement and every NFR (or give the NFR its own verification in section 6).

- AC1 (covers R1): Given … When … Then …
- AC2 (covers NFR1): Given … When … Then …

## 10. Dependencies, constraints, and assumptions
**Existing features and systems touched** (by name; the interaction mechanism is a feature-spec decision):

| Feature or system | Why it is needed | Owner | Status (ready · blocked) |
|---|---|---|---|

**External dependencies** (services, vendors, teams): same columns.
**Constraints:** regulatory, performance, accessibility, budget, deadline.
**Assumptions:** each labeled **Assumption**, with an owner who confirms it.

## 11. Release and regression expectations
Product-level expectations. The mechanism (migration order, deploy steps) goes into the feature spec and the release checklist.

| Item | Decision |
|---|---|
| User journeys that must keep working | <journeys and expected unchanged behavior; QA uses this as the regression scope> |
| Backward compatibility | compatible · migration needed · n/a, with reason |
| Rollout preference | direct release · staged · other; owner. A feature flag needs its own ADR (not decided). |
| Rollback trigger | <metric or incident threshold> · action · accountable owner |
| Post-release review | <date, owner, and the decision: keep, revise, or roll back> |

## 12. Open questions and risks
Unknowns stay visible here until answered; each has an owner.

| Open question or risk | Impact | Owner | Resolved how |
|---|---|---|---|

## 13. Discovery sources
Prior art from `01-idea.md`, and the findings in `02-research.md` and `03-prototype.md` this PRD relies on, by row. A requirement that rests only on a prototype says so.

## 14. Change log
After approval, any change to scope, requirements, or acceptance criteria is recorded here and re-approved at the PRD gate (tier M: Spec gate) before downstream documents rely on it. Downstream files (architecture review, feature spec, task breakdown) are updated in the same change.

| Date | Change | Reason (finding, feedback) | Re-approved by |
|---|---|---|---|

## 15. Gate review
Filled by the reviewer (`docs/01-workflow/sdlc-pipeline.md`, section 4).

| Round | Date | Reviewer | Verdict (approve · approve with notes · changes requested · drop) | Findings, or notes and their owner |
|---|---|---|---|---|
