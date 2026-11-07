# Architecture Review: <Feature name>

- Slug: `<feature-slug>` (file `05-architecture-review.md`)
- PRD: `04-prd.md` (approved at the PRD gate)
- Research: `02-research.md`
- Tier: L (tier M has no architecture review; its decisions go in the feature spec, section 2)
- Status: draft | in review | approved | dropped
- Gate: Architecture gate
- Owner: <human>
- Author: <human, or "AI agent">
- Date: YYYY-MM-DD
- Approved by: <name> (Software Architect or Architecture Review Board), <date> — format and authority: `docs/01-workflow/roles.md`

This phase fixes the decisions that are expensive to reverse, before the detailed spec is written. It answers **who owns what and what crosses a boundary**, judged against the approved PRD. Names and tables only: fields, schemas, and file lists belong to the feature spec, which carries each decision here without copying it. Lint already checks imports; this review judges what lint cannot.

## 1. Ownership
Answer all three, then decide (`docs/02-architecture/modular-monolith.md`):
1. Does it own data or rules with their own vocabulary that no other feature owns? yes / no
2. Does it change for different reasons or at a different pace than the nearest feature? yes / no
3. Is it generic infrastructure rather than business? yes / no

Decision: **new feature `<name>`** · **extend `<feature>`** · **`shared`**. Reason: <one sentence>.

**Belongs here:** <capabilities and data>. **Stays out:** <what looks related, and which feature owns it>.

## 2. Decisions
One row per decision research left open, plus any found here. An architectural decision gets an ADR.

| ID | Decision | Options (research reference) | Choice | Reason | ADR |
|---|---|---|---|---|---|
| D1 | | | | | |

## 3. Public API and cross-feature use
Client-safe exports go in `index.ts`; server-only exports go in `index.server.ts` (`docs/02-architecture/cross-feature-communication.md`). List every export a consumer needs now; the spec and tasks must deliver each one.

| Export | Entry | Kind | Consumer | Needed by which PRD id |
|---|---|---|---|---|

| Feature consumed | Symbol and entry | Mechanism (read · call in one transaction · event) | Reason |
|---|---|---|---|

**Events** ("none" if none):

| Event | When it fires | Consumers | Delivery class (best-effort in-process · durable: needs an ADR) | If a handler fails |
|---|---|---|---|---|

## 4. Data impact
Conventions: `docs/03-standards/database.md`.

| Table (owner) | New or changed | Why | References another feature? FK or id only, and why |
|---|---|---|---|

**Migration class:** additive · destructive · backfill. **Reversible:** yes / no, and who accepts a no. **Seed or reference data:** <…>.

## 5. Security
From the PRD's roles and data tables (`docs/03-standards/security.md`).

| Capability | Who may do it | Enforced where (a function or middleware, not only `beforeLoad`) | Data scope (owner, tenant, warehouse) |
|---|---|---|---|

Sensitive data, retention, and deletion: <mechanism and owner, or `n/a: no sensitive data`>. Server routes, and how each authenticates: <none, or list>.

## 6. Risks and dependencies
**New dependencies:** library and ADR link, or "none". **Deviations from `docs/03-standards/*`:** each with an ADR, or "none".

| Risk | Impact | Mitigation | Owner |
|---|---|---|---|

## 7. PRD coverage
Every in-scope PRD item appears here, or the review says why it needs no architectural decision. An item that cannot be met goes back to the PRD's change log and gate.

| PRD item | Where it is decided | Note |
|---|---|---|

## 8. Change log
After approval, any change is recorded here and re-approved at the Architecture gate; the feature spec is updated in the same change.

| Date | Change | Reason | Re-approved by |
|---|---|---|---|

## 9. Gate review
Filled by the reviewer (`docs/01-workflow/sdlc-pipeline.md`, section 4). "Yes" with nothing to point at counts as "no".

| Question | Answer and where |
|---|---|
| Does each in-scope PRD item have a place in section 7? | |
| Is each new public export tied to a consumer that needs it now? | |
| Is authorization enforced in a function or middleware for every capability? | |
| Does anything create a cross-feature cycle, or a query on another feature's table? | |
| Can the migration be rolled back, or is the reason it cannot accepted by name? | |

| Round | Date | Reviewer | Verdict (approve · approve with notes · changes requested · drop) | Findings, or notes and their owner |
|---|---|---|---|---|
