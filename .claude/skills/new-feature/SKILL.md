---
name: new-feature
description: Scaffold a new feature module following the feature-driven modular monolith (folders, public API, schemas, queries, server layer, tests, README). Use for the first task of a feature after the feature spec and task breakdown are approved, or when asked to create a feature/module.
---

# New feature module

Prerequisites: approved `06-feature-spec.md` and `07-tasks.md` (or tier S). Read `docs/02-architecture/modular-monolith.md` and `folder-structure.md` first. The spec's layer breakdown (section 3) says which files this task creates; create only those.

## Steps

1. Choose the kebab-case feature name from the spec. Confirm no existing feature already owns the capability (`src/features/*`); if one does, extend it instead.
2. Create the skeleton (empty files only where needed; do not generate speculative code):

   ```
   src/features/<name>/
     index.ts            # public API, client-safe: export only what other code may use
     index.server.ts     # only if another feature needs a service function or this one has listeners (server-only)
     events.ts           # only if this feature publishes events (name + Zod payload)
     README.md           # purpose, public API, owned tables, events
     schemas.ts
     queries.ts
     components/  hooks/
     server/             # *.functions.ts, *.service.ts, *.repository.ts, *.rules.ts (only for non-trivial rules), *.listeners.ts (only if it subscribes)
     db/schema.ts        # only if the feature owns tables
     __tests__/
   ```
3. Fill `README.md`: purpose, public API list, owned tables, emitted/consumed events. Copy the public API, events, and tables from the spec (sections 2 and 4); do not invent entries the spec does not list.
4. If the feature owns tables, follow skill `add-db-table`. `drizzle.config.ts` finds `db/schema.ts` through its glob; nothing is wired in `shared/`.
5. Add the thin route file(s) under `src/routes/<name>/` that compose the feature (loader calls the feature's `queryOptions`; no logic).
6. For each server function, follow skill `add-server-function`.
7. For every library API used, follow skill `verify-library-docs` and record `Docs consulted`. The `auth` feature follows `docs/04-stack/better-auth.md` for its files and tables, with skills `better-auth-best-practices` and `email-and-password-best-practices` for options (`docs/05-agent-tooling/skills.md`).
8. Run `typecheck`, `lint`, tests, and the import-boundary check. Fix violations structurally (do not disable the rule).

## Guardrails

- Nothing outside the feature imports its internals; `index.ts` (client-safe) and `index.server.ts` (server-only) are the only surface. Never export a service function from `index.ts`. Read `docs/02-architecture/cross-feature-communication.md` before adding a cross-feature call or an event.
- No `utils.ts`/`helpers.ts` dumping files and no `utils/` folder (it gets no layer rules): name the concept, for example `components/<entity>-form-values.ts`.
- Forms follow `docs/04-stack/tanstack-form.md`, tables `docs/04-stack/tanstack-table.md`, components `docs/03-standards/components.md`.
- No new dependency without an ADR.

## Output

List of created files, the public API exported, and commands run with results.
