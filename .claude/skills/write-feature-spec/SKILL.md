---
name: write-feature-spec
description: Draft the feature spec for an approved PRD and its architecture review (pipeline phase 6): boundaries, data model, contracts, errors, cache, UI, security, tests mapped to acceptance criteria, rollout. Use before any build work on a tier M or L feature. Produces 06-feature-spec.md for the Spec gate.
---

# Write the feature spec

Pipeline phase 6. Inputs: `04-prd.md`, `02-research.md`, `05-architecture-review.md` (tier L), `03-prototype.md` if present. Output: `specs/<slug>/06-feature-spec.md` from `docs/templates/feature-spec.md`. It says **how**, by PRD id; it does not copy the PRD or repeat repo-wide rules. Read `docs/02-architecture/modular-monolith.md`, `design-principles.md`, `docs/03-standards/api-conventions.md`, `error-handling.md`, `security.md`.

## Steps

1. Tier L: check that `05-architecture-review.md` is `approved`, and carry each decision and public export by id; do not decide them again. Tier M: start from the decisions `02-research.md` left open; each becomes a row in section 2 with options, choice, reason, and an ADR link when architectural. Every in-scope PRD item gets a place, or leaves through a change log.
2. Decide ownership with the **qualification** in section 2 (three questions: new feature, extend one, or `shared`): which feature owns the change (`src/features/*`), the public API additions (client-safe `index.ts` versus server-only `index.server.ts`), cross-feature calls (read, call in one transaction, or event: `docs/02-architecture/cross-feature-communication.md`), events with their delivery class, and new dependencies. A reaction that must not be lost needs a durable event, which needs its own ADR first. A new cross-feature dependency or public API is tier L. Any new dependency needs an ADR.
3. Fill the layer breakdown (every file to create or change), data model with indexes (`docs/03-standards/database.md`), Zod schemas, server functions with auth and side effects, the error table (one row per PRD EC), queries and cache with how each read loads (`docs/02-architecture/data-fetching.md`), routes and UI.
4. Enforce security from the PRD's roles and sensitive-data tables: authorization **inside** each function or middleware, DTOs not rows, retention and deletion mechanism. A change to sign-in, sessions, or the auth config reads `docs/04-stack/better-auth.md` and skills `better-auth-security-best-practices` and `email-and-password-best-practices`, and states each option it sets, verified for the installed version. A plugin or sign-in method beyond email and password needs an ADR first (ADR 0007, R), and its skill in `docs/05-agent-tooling/skills.md` lists the options to decide.
5. Map **every AC and NFR** to a test level and name in section 11. A criterion with no test blocks the gate. Say which tests are written first.
6. Rollout and rollback honor the PRD's expectations. Platform steps stay `TODO(verify)` until the deploy platform steps are documented (runtime is decided: Node in a container, ADR 0007).
7. List only the exact library APIs the design calls in section 13, each verified (skill `verify-library-docs`) with source URL and date. Never write an API from memory.
8. For a feature with UI, section 8 holds a layout sketch, the responsive behavior, and the state-location table (one home per piece of state); check them against the PRD flows and `docs/04-stack/tanstack-query.md`.
9. A deviation from `docs/03-standards/*` needs an ADR. An item that the repo has no rule for (for example a new kind of external adapter, decision S) is asked about, not invented.

Before handing over, check the text against `docs/03-standards/writing.md`.

## Output
The file path, the decisions needing a human, and unresolved `TODO(verify)` items. Set the status to `in review` when you hand it over; `approved` follows the approval rule (`docs/01-workflow/sdlc-pipeline.md`, section 4), and in tier M the same review covers the PRD and the task breakdown (`write-tasks`). Tier L stops here until the Spec gate passes, unless the same Tech Lead owns both gates and the header says `Tasks gate: merged with this gate`.
