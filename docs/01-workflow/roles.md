# Roles and Decision Authority

**When to read:** when filling `Approved by:` or `Decided by:`, when asking who decides a phase, or when mapping these roles onto a small team.

Doing the work and deciding about it are separate. A developer writes code, a reviewer checks it, and the Tech Lead answers for the result. One person may hold several roles (see "Combining roles"), but an AI agent holds none of the deciding ones.

## Who decides each phase

`scripts/check-docs.mjs` holds the same list as the last column, and fails if this table or a template names different roles.

| Artifact | Phase | Decision | Recorded as | Authority (the roles the record must name) |
|---|---|---|---|---|
| `01-idea.md` | Idea | Is it promising enough to research? | `Decided by:` | Product Manager or Business Sponsor |
| `02-research.md` | Research | Are the problem and the opportunity validated? | `Decided by:` | Product Manager |
| `03-prototype.md` | Prototype | Is the proposed solution worth defining? | `Decided by:` | Product Manager or Product Design Lead |
| `04-prd.md` | PRD | Are the product requirements approved? | `Approved by:` (PRD gate) | Product Owner or Business Sponsor |
| `05-architecture-review.md` | Architecture Review | Is the architecture sound and within standards? | `Approved by:` (Architecture gate) | Software Architect or Architecture Review Board |
| `06-feature-spec.md` | Feature Spec | Are the product behavior and the technical spec approved? | `Approved by:` (Spec gate) | Product Owner and Tech Lead |
| `07-tasks.md` | Task Breakdown | Is the work small, clear, and ready? | `Approved by:` (Tasks gate) | Tech Lead |
| `08-review-log.md` | Execution, Docs, Review | Does the implementation meet the standards and is it ready for QA? | `Decided by:`, plus a human reviewer on every PR | Tech Lead |
| `09-qa.md` | QA | Is quality met, and is the product accepted? | `Decided by:` | QA Lead and Product Owner |
| `10-release.md` | Release | May it go to production? | `Approved by:` (Release gate) | Release Owner |
| `11-learnings.md` | Learn | What do we keep, fix, or build next? | `Decided by:` | Product Manager |
| `12-measure.md` | Measure | Did the product reach its target? | `Decided by:` | Product Manager or Business Owner |

"Or" means either role may decide. "And" means both must appear. They are not substitutes: QA Lead answers for the quality process, Product Owner for business acceptance. Product Manager answers for product decisions, Product Design Lead for the quality of design artifacts.

A phase with no gate still has a decision. The agent writes the artifact, stops, and asks for it; the artifact stays `draft` until it is recorded. Only the six gates add a review round and a Gate review table.

## How to record it

```text
- Approved by: Ani Wijaya (Product Owner), 2026-10-31; Budi Santoso (Tech Lead), 2026-10-31
- Decided by: Budi Santoso (Product Manager, Product Owner), 2026-10-31, via chat
- Decision quote: "research selesai, masalah tervalidasi, lanjut ke PRD"
```

- One entry per person, separated by `;`. One person holding several roles lists them all in the parentheses.
- Role names are not translated (`docs/03-standards/writing.md`, "Language").
- The source of the approval, and when `via chat` or `via review <link>` applies: `sdlc-pipeline.md`, section 4. A `via chat` decision quotes the message: in the Gate review's findings for a gate, or in `- Decision quote:` for a phase with no gate.

## Who does what

Accountable answers for the outcome. Responsible does the work. Consulted is asked before the decision.

| Phase | Accountable | Responsible | Consulted |
|---|---|---|---|
| 1 Idea | Product Manager | Founder, Product Owner, Business Analyst | Business Sponsor, Domain Expert, UX Researcher |
| 2 Research | Product Manager | UX Researcher, Business Analyst, Product Analyst, AI agent | Domain Expert, Market Researcher, Solution Architect, Data Analyst |
| 3 Prototype | Product Manager | UX/UI Designer, UX Researcher, Frontend Engineer, AI agent | Tech Lead, Domain Expert, prospective users |
| 4 PRD | Product Manager or Product Owner | Product Manager, Business Analyst, AI agent | Domain Expert, UX/UI Designer, Tech Lead, Software Architect, Security |
| 5 Architecture Review | Software Architect or Solution Architect | Software Architect, Domain Architect, Technical Architect, AI agent | Tech Lead, Security Architect, Data Architect, API Architect, SRE, QA |
| 6 Feature Spec | Product Owner for behavior; Tech Lead for the technical sections | Business Analyst, Product Analyst, UX/UI Designer, engineers, AI agent | Software Architect, QA Engineer, Domain Expert |
| 7 Task Breakdown | Tech Lead | Engineers, QA Engineer, SDET, AI agent | Architect, Product Owner, Business Analyst, DevOps |
| 8 Execution, Docs, Review | Tech Lead or Engineering Lead | Developers, AI agents, Technical Writer, code reviewers | QA, Security Engineer, Documentation Owner, Architect |
| 9 QA | QA Lead or Test Manager | QA Engineer, Test Engineer, SDET, Automation Engineer | Developers, Security Engineer, Product Owner, UX Designer |
| 10 Release | Release Manager or Release Owner | DevOps Engineer, SRE, Platform Engineer | Tech Lead, QA Lead, Security Engineer, Product Owner, Change Manager |
| 11 Learn | Product Manager or Product Owner | Tech Lead (guardrails), UX Researcher, Business Analyst, Customer Success, Support Engineer | QA Lead, Domain Expert, Scrum Master |
| 12 Measure | Product Manager | Product Analyst, Data Analyst, Analytics Engineer | Data Engineer, SRE, Business Stakeholder, Finance |

**In phase 8, three responsibilities must have a name:** the implementation owner (the Tech Lead), the documentation owner (docs change with the code), and an independent reviewer (a human who approves the PR under the repository's rules).

## Roles across phases

| Role | Involved in |
|---|---|
| Business Sponsor | Idea, Research, PRD, Release |
| Domain Expert | Idea through Feature Spec, QA, Learn |
| Business Analyst | Research, PRD, Feature Spec, Task Breakdown, Learn |
| UX Researcher | Idea, Research, Prototype, Feature Spec, Learn |
| UX/UI Designer | Research, Prototype, PRD, Feature Spec, QA |
| Software Architect | Research, PRD, Architecture Review, Feature Spec, Execution |
| Tech Lead | Research, PRD, Architecture Review, Feature Spec, Task Breakdown, Execution, QA, Release |
| Security Engineer | Research, PRD, Architecture Review, Feature Spec, Execution, QA, Release |
| QA Engineer | Feature Spec, Task Breakdown, Execution, QA, Release |
| SRE or DevOps | Architecture Review, Task Breakdown, Execution, QA, Release, Measure |
| Technical Writer | PRD, Feature Spec, Execution, Release, Learn |
| Documentation Owner | Every phase that creates or changes documentation |
| Data or Product Analyst | Research, PRD, Learn, Measure |
| Scrum Master or Agile Coach | Task Breakdown, Execution, QA, Learn |
| AI Agent Engineer, AI Evaluator, AI Safety Owner | Only for a product that contains AI: from Research or Prototype through Execution and QA; the evaluator also in Measure |

Security, reliability, performance, privacy, and compliance run through every phase. They are not a check just before release.

## AI agents

An agent may draft artifacts, implement, write docs, run tests, and review its own work. It does not replace a human where approval is required: it never appears in `Approved by:`, `Decided by:`, or as a Gate review's reviewer. A passing check is not a decision.

## Combining roles

Roles describe decisions, not job titles. Name every role a person holds in the record.

| Organization | Typical combinations |
|---|---|
| Solo developer or startup | Founder: Business Sponsor, Business Owner, Product Manager, Product Owner. Technical lead: Software Architect, Tech Lead. Operations: DevOps, SRE, Release Owner. Quality: QA Lead. A solo owner holds them all (`Approval mode: personal`) |
| Mid-size | Product: Product Manager, Product Owner, Business Analyst, Product Analyst. Design, Architecture, Engineering, Quality (QA Lead, SDET), Platform (DevOps, SRE), Governance (Security, Compliance, Documentation Owner) as separate teams |
| Enterprise | Separate organizations for product, architecture governance (Architecture Review Board), engineering, security and privacy, quality engineering, platform and SRE, release and change management, data and analytics, AI governance |

Combining roles removes a person, not a check. The Spec and Tasks gates may be reviewed together when the same Tech Lead owns both (`sdlc-pipeline.md`, section 4), and each artifact keeps its own questions and record.

## What this repo does not adopt

Output lists per phase live in the templates, not here. Three things differ from common role charts, on purpose:

- **The Feature Spec holds behavior and the technical design together,** so both Product Owner and Tech Lead approve it. There is no separate technical plan.
- **Learn runs before Measure,** so a delivery mistake becomes a guardrail without waiting for a measurement window (ADR 0017). Instrumentation is planned in the PRD and the Feature Spec. Measure then records what the numbers mean for the product.
- **Six of the twelve decisions stop for a Gate review.** The other six are one recorded line.
