# 0001 Feature-driven modular monolith

- Status: accepted
- Date: 2026-10-15

## Context

We build an enterprise web app on TanStack Start with AI agents writing much of the code. Agents need a structure where the correct location and boundary for any change is unambiguous, and where mistakes in one area do not spread.

## Decision

One deployable application, split internally into feature modules under `src/features/<name>/`, each with a single public API (`index.ts`), owned database tables, and layered internals (UI → queries → server functions → services → repositories). `src/routes/` composes features; `src/shared/` holds infrastructure with no feature imports. Boundaries are enforced in CI.

## Consequences

- Positive: predictable placement, testable modules, small PRs, a path to extraction later, easier agent context (work inside one feature).
- Negative: more files and discipline than a flat app; cross-feature needs require explicit APIs.
- TanStack Router is file-based under `src/routes/`; features cannot own route files without custom route configuration, so routes stay thin and delegate.

## Alternatives considered

- Flat `components/ hooks/ utils/` structure: simple, but ownership and boundaries blur quickly.
- Microservices: operational cost not justified.
- Route-colocated features (code under `routes/`): couples URL structure to domain structure.
