# Glossary

**When to read:** when you meet an unfamiliar term in a spec or a doc, when a business term has to be named in code, or when adding a table or a public concept.

Maps words to code, so a term means one thing everywhere. Each entry points at the document that owns the detail. Terms from Next.js projects: the table in `docs/04-stack/tanstack-start.md`.

## Architecture and code

| Term | Meaning | In code |
|---|---|---|
| Feature | A self-contained business capability that owns its rules, tables, and UI | `src/features/<feature>/` |
| Public API (of a feature) | The only part other code may import | `index.ts` (client-safe), `index.server.ts` (server-only) |
| Thin route | A route file that composes a feature and holds no business logic | `src/routes/**` |
| Server function | Same-origin RPC: validate, authorize, call a service | `createServerFn` in `server/<name>.functions.ts` |
| Server route | An endpoint with its own HTTP address, for callers outside our UI | `server.handlers` in `src/routes/api/**` |
| Service | Business logic; returns a `Result` for expected failures | `server/<name>.service.ts` |
| Repository | Drizzle queries for the feature's own tables | `server/<name>.repository.ts` |
| Business rule file | Pure, non-trivial rules with no I/O | `server/<name>.rules.ts` |
| Listener | Reacts to another feature's event by calling its own service | `server/<name>.listeners.ts` |
| Event | A named fact about something that already happened; returns nothing | `events.ts`, named `<feature>.<past-tense-fact>` |
| Composition root | The one place that registers every feature's listeners | `src/subscribers.server.ts` |
| Schema | Zod definition of input or output; its type is inferred | `schemas.ts` |
| DTO | The serializable object a server function returns; never a raw row | Inferred from a schema, or a `Pick` of one |
| Query options | The shared definition of a read, used by loaders and components | `queries.ts` |
| Key factory | Builds query keys; keys are never inline arrays | `<entity>Keys` in `queries.ts` |
| `AppError` | An expected failure, as a plain object | `shared/errors`, `appError.*` |
| Error code | A stable string the UI switches on | `errors.ts`, for example `INVOICE_ALREADY_PAID` |
| `Result` | A success or an expected failure, returned as a value | `ok(data)`, `err(error)`; branch on `.ok` |
| Boundary | The wrapper that logs an unexpected failure once and hides its detail | `withErrorBoundary`, `withRouteBoundary` |
| Gate (quality) | An automated check that must pass | `pnpm lint`, `check:gates`, and others in `linting-and-formatting.md` |
| Suppression | Any way of silencing a check; forbidden | `no-suppression.md` |

## Pipeline

| Term | Meaning | Where |
|---|---|---|
| Tier S, M, L | How much process a change gets, by size and risk | `docs/01-workflow/sdlc-pipeline.md`, section 1 |
| Risk trigger | A property that raises the tier (auth, migration, new dependency, and others) | Same section |
| Gate (human) | A required human approval: PRD, Spec, PR, Release | Same document, section 4 |
| Artifact | A phase's output file | `specs/<slug>/` |
| Task | One vertical change, one PR, leaving `main` releasable | `07-tasks.md` |
| AC | Acceptance criterion, written as Given/When/Then | `04-prd.md` |
| Spike | Throwaway code that tests a risky hypothesis; never merged | `spike/<slug>`, `03-prototype.md` |
| ADR | A recorded decision and its reasons | `docs/decisions/` |

## Confidence labels

**Verified, Inferred, Unknown:** `docs/00-principles/anti-hallucination.md`. In ADRs, **observed** means the behavior was run, not just read.

## Abbreviations

| Short | Long |
|---|---|
| CSP | Content Security Policy |
| CSRF | Cross-Site Request Forgery |
| DTO | Data Transfer Object |
| FK | Foreign key |
| MCP | Model Context Protocol |
| NFR | Non-functional requirement |
| PII | Personally identifiable information |
| PRD | Product Requirements Document |
| RPC | Remote procedure call |
| SSR | Server-side rendering |

## Business terms

Add a row when a feature introduces a business term, in the PR that introduces it. Use the business's word in code; do not invent a synonym.

| Business term | Owner feature | Table | Type or schema | UI label |
|---|---|---|---|---|
| *None yet: this template has no business domain.* | | | | |
