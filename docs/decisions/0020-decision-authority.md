# 0020 Decision authority per phase

- Status: accepted
- Date: 2026-10-31
- Deciders: owner supplied the role mapping and asked for it to be fitted to these docs; the fitting choices below are the agent's and can be reversed by a new ADR
- Replaces: the gate owners and merged-gate check in ADR 0018
- Extends: ADR 0017, ADR 0018, ADR 0019

## Context

ADR 0018 named who owns each gate as prose, and the script read only that a name and date existed. So `Approved by: Budi, 2026-10-31` passed on any artifact, whatever Budi's role, and a two-person gate could pass with one. The owner then supplied a role map: accountable, responsible, and consulted for all 12 phases, roles across phases, approval authority per phase, and how roles combine by organization size.

## Decision

1. **`docs/01-workflow/roles.md` is the one place for roles.** It holds the authority table, who does what, roles across phases, how to record a decision, and how to combine roles.
2. **Every phase has a decision record.** The five gated artifacts use `Approved by:`. The other seven use `Decided by:`, including the review log, which the Tech Lead closes. A record is `name (role), date`, with `;` between people.
3. **Authority, as supplied:** Idea: Product Manager or Business Sponsor. Research: Product Manager. Prototype: Product Manager or Product Design Lead. PRD: Product Owner or Business Sponsor. Architecture: Software Architect or Architecture Review Board. Spec: Product Owner **and** Tech Lead. Tasks: Tech Lead. Execution: Tech Lead, plus a human reviewer per PR. QA: QA Lead **and** Product Owner. Release: Release Owner. Learn: Product Manager. Measure: Product Manager or Business Owner.
4. **One list, compared.** `AUTHORITY` in `scripts/check-docs.mjs`, `roles.md`, and each template must name the same roles, or the check fails.
5. **Merged gates:** whoever approves the tasks must also have approved the spec. The old rule, same last reviewer, cannot hold when the spec needs two people and the tasks one.

### Fitted, and how it differs from the supplied map

| Supplied | Here | Why |
|---|---|---|
| 12 gates | 6 gates with a review round; 6 phases with one recorded line, where the agent still stops and asks | Keeps the authority per phase, without a review table for a learning note. ADR 0017 already weighs 5 stops before production on tier L |
| Feature Spec is behavior only, owned by Product Owner; design lives in Architecture Review | One spec with behavior and technical design; Product Owner and Tech Lead both approve | Tier M has no architecture review, and the supplied approval line already says "behavior and technical spec" |
| Spec approved with Architect or Tech Lead (ADR 0018) | Tech Lead, with the Architect at their own gate | The owner's later map |
| PRD by Product Owner and Tech Lead (ADR 0018) | Product Owner or Business Sponsor; Tech Lead consulted | The owner's later map. Feasibility reaches the PRD through research |
| Learn uses Measure's results | Learn runs first, and Measure closes the feature with its own product conclusion | ADR 0017, the owner's choice: a guardrail must not wait for a window. Instrumentation stays in the PRD and spec, as supplied |
| Learn is a product retrospective | Agent mistakes and guardrails stay, Tech Lead responsible; product and operations findings added | Removing them would lose how these rules improve |
| Estimates in the task breakdown | An optional column, a person's estimate | ADR 0016: an agent has no basis for one |
| Test and documentation tasks | Part of the task they verify | Tasks are vertical, and docs ship in each PR |
| AI roles, Scrum Master, and others | In the cross-phase table; the AI roles only for a product containing AI | Most features here contain no AI |
| Output lists per phase | Only what was missing went into templates: research areas, Definition of Ready, operational readiness, release notes, product findings, other KPIs | The rest already had a section; copying the lists would duplicate templates |

## Consequences

- **More stops:** research, prototype, QA, learn, and measure now wait for one person's line. Tier M and solo owners feel this most; `via chat` keeps it to one message.
- **QA now always needs the Product Owner,** as the map says, even when the PRD asks for no formal UAT.
- **The check reads text.** It sees a role written next to a name, not whether that person holds it. A false role passes, as a false name does (ADR 0018).
- **Role names are English and exact.** A translated role fails, by the language rule in ADR 0018.
- **Any app with final artifacts** fails `check:docs` until each record names its roles. `README.md` says so.

## Not verified

- Whether five more one-line stops are too many in practice. This is the first thing a pilot should measure.
- A real product owner, QA lead, or release owner using these records.

## Alternatives considered

- **Twelve full gates, as supplied.** Twelve Gate review tables per feature, most never read.
- **Roles only in prose.** It is what ADR 0018 had, and it let the wrong person pass.
- **A central team file mapping people to roles.** It would catch a false role, but needs a file per app and upkeep; worth a new ADR if false roles become a real problem.

## Verification

Docs consulted: none for library APIs; none were added. Checked on 2026-10-31 by `node --test scripts/test-check-docs.mjs`, including new cases for each role rule and for a mismatch between the script, `roles.md`, and a template.
