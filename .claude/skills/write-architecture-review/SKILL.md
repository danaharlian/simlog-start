---
name: write-architecture-review
description: Draft the architecture review for an approved PRD on a tier L feature (pipeline phase 5): ownership, boundaries, public API, cross-feature calls and events, data impact, security, ADRs. Use after the PRD gate and before the feature spec. Produces 05-architecture-review.md for the Architecture gate. Tier M skips it.
---

# Write the architecture review

Pipeline phase 5, tier L. Inputs: approved `04-prd.md`, `02-research.md`, and `03-prototype.md` if present. Output: `specs/<slug>/05-architecture-review.md` from `docs/templates/architecture-review.md`. Read `docs/02-architecture/modular-monolith.md`, `cross-feature-communication.md`, `design-principles.md`, `docs/03-standards/database.md`, and `security.md`.

## Steps

1. Check that `04-prd.md` is `approved`. If not, stop.
2. Decide ownership with the three questions in section 1, and write what stays out and who owns it. Check `src/features/*` first.
3. Turn research's open decisions into rows in section 2, with an ADR for each architectural one. An item with no repo rule (for example decision S, external adapters) is asked about, not invented.
4. List every public export a consumer needs **now**, with that consumer and the PRD id. A getter promised here must reach the spec and a task. No export "in case".
5. Choose a mechanism for each cross-feature use: read, a call in one transaction, or an event. Cycles are forbidden. A reaction that must not be lost needs a durable event, which needs its own ADR first.
6. Fill data impact by table and owner. Fields belong to the spec. A reference to another feature's table holds the id; any FK follows `database.md`.
7. Fill security per capability, from the PRD's roles: who, enforced where, and which data scope. A capability needing a Better Auth plugin or a sign-in method beyond email and password gets an ADR row (ADR 0007, R); `docs/05-agent-tooling/skills.md` says which skill covers it.
8. Fill PRD coverage: every in-scope item has a place. An item that cannot be met goes back through the PRD's change log.
9. Leave section 9 (Gate review) empty for the reviewer.

Before handing over, check the text against `docs/03-standards/writing.md`.

## Output
The file path, the decisions needing a human, and new ADRs. Set the status to `in review`; `approved` follows the approval rule (`docs/01-workflow/sdlc-pipeline.md`, section 4). Next is skill `write-feature-spec`.
