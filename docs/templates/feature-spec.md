# Feature Spec: <Feature name>

- Slug: `<feature-slug>` (file `06-feature-spec.md`)
- PRD: `04-prd.md` (approved at the PRD gate)
- Research: `02-research.md` (decisions it left open are answered in section 2) | skipped: see the PRD
- Architecture review: `05-architecture-review.md` (every decision and export is carried here) | n/a: tier M
- Tier: S | M | L (from `01-idea.md`)
- Status: draft | in review | approved | dropped
- Gate: Spec gate
- Owner: <human>
- Author: <human, or "AI agent">
- Date: YYYY-MM-DD
- Approved by: <name> (Product Owner), <date>; <name> (Tech Lead), <date> — format and authority: `docs/01-workflow/roles.md`
- Tasks gate: separate | merged with this gate (the same Tech Lead owns both; tier M is always reviewed together)
- Owning feature module: `src/features/<name>`

The spec says **how**. It refers to PRD ids (US, R, NFR, AC, EC) instead of copying them. Repo-wide rules (layers, errors, API conventions, testing) live in `docs/` and are not repeated here; write only what is specific to this feature, or a deviation with its ADR. Names and tables only: code goes in the tasks.

Tier M minimum: sections 1, 2, 3, 4 (if data changes), 6, 8 (if there is UI), 11, 12, 15. Write "n/a" in the rest. Tier L: all sections, with an ADR for every architectural decision.

## 1. Behavior
Step-by-step user-visible behavior, including empty, loading, and error states. Every edge case from the PRD (EC ids) is handled here or in section 6 (errors); list which.

## 2. Architecture and boundaries
**Tier L:** ownership, decisions, public API, events, and security were decided in `05-architecture-review.md`. Refer to them by id, and fill only what is new. **Tier M:** fill this section; it is the architecture review. Check against `docs/02-architecture/modular-monolith.md`.

**Feature module qualification** (new module or existing one?). A feature is a **business capability** that owns its data and rules (`docs/02-architecture/modular-monolith.md`, "split by business capability"). Answer all three, then decide:
1. Does it own data (tables) or rules with their own vocabulary that no other feature owns? yes / no
2. Does it change for different reasons or at a different pace than the nearest existing feature? yes / no
3. Is it generic infrastructure (UI kit, db client, formatting, env) rather than business? yes / no

Decision: **new feature `<name>`** (1 and 2 yes, 3 no) · **extend `<existing feature>`** (otherwise, and a new cross-feature call would be the alternative: say why not) · **`shared`** (3 yes). Reason: <one sentence>. Update the "Owning feature module" header line to match.

**Boundary of this feature:** belongs here: <capabilities and data>. Stays out: <what looks related but is owned elsewhere, and by which feature>.

**Decisions.** One row per decision that `02-research.md` asked this spec to make, plus any you discover.

| Decision | Options considered (research reference) | Choice | Reason | ADR |
|---|---|---|---|---|

**Public API added or changed** (only what other code needs). Client-safe exports go in `index.ts`; **server-only exports (service functions, listener registration) go in `index.server.ts`**, never in `index.ts` (`docs/02-architecture/cross-feature-communication.md`):

| Export | Entry (`index.ts` · `index.server.ts`) | Kind (query options · service function · type · component · event definition) | Consumers |
|---|---|---|---|

**Cross-feature consumption** (this feature uses another feature's `index.ts`, or its `index.server.ts` from server code; "none" if none). Each new one is an L trigger (`docs/01-workflow/sdlc-pipeline.md`).

| Feature consumed | Symbol and entry (`index.ts` · `index.server.ts`) | Mechanism (read · call in one transaction · event) | Reason |
|---|---|---|---|

**Events** (in-process, typed; to be documented in the owning feature's `README.md`; "none" if none):

| Event | Payload (Zod schema) | When it fires | Emitted by | Consumed by (listener file) | Delivery class (best-effort in-process · durable: needs an ADR) | If a handler fails |
|---|---|---|---|---|---|---|

**New dependencies:** library, why, ADR link (each needs an ADR); or "none".
**Deviations from `docs/03-standards/*`:** each needs an ADR; "none" if there are none.

## 3. Layer breakdown (what gets created or changed)
One row per file or group of files. The task breakdown assigns every row to a task.

| Layer | File(s) | Create / change | Notes (what is added) |
|---|---|---|---|
| Table | `features/<f>/db/schema.ts` | | |
| Schemas | `features/<f>/schemas.ts` | | |
| Repository | `features/<f>/server/<name>.repository.ts` | | |
| Service | `features/<f>/server/<name>.service.ts` | | |
| Rules (only for non-trivial rules) | `features/<f>/server/<name>.rules.ts` | | |
| Server function | `features/<f>/server/<name>.functions.ts` | | |
| Query options and keys | `features/<f>/queries.ts` | | |
| Hooks | `features/<f>/hooks/` | | |
| Components | `features/<f>/components/`, `shared/ui` | | |
| Routes | `src/routes/…` (thin) | | |
| Events and listeners | `features/<f>/events.ts`, `server/<name>.listeners.ts` | | |
| Public API and README | `features/<f>/index.ts`, `index.server.ts` (only if needed), `README.md` | | |

## 4. Data model
Tables owned by this feature. If nothing changes, write "No database changes."

| Table | Column | Type | Null | Default | Constraint or FK (`ON DELETE`) |
|---|---|---|---|---|---|

Conventions: `docs/03-standards/database.md`. Primary key: `uuid` with `defaultRandom()` (ADR 0007, H). **A reference to another feature's table:** say whether it has a foreign key and why, using the table in `database.md`. If it does, it is a custom migration, and never `CASCADE`.

**Indexes** (one per foreign key, and per filter or sort used by a list query; name the query it serves):

| Table | Columns | Unique? | Serves (function or query) |
|---|---|---|---|

**Migration notes:** additive or destructive, backfill, reversible, seed data or reference data needed? A schema change to existing data makes the tier L.

**Transactions and concurrency:** which operations write more than once, and so need one transaction (`docs/04-stack/drizzle-postgres.md`, "Transactions"). Where two users or retries can collide (a status change, a counter, a form two people edit, a double submit), what prevents it, chosen from the race table in `docs/04-stack/drizzle-concurrency.md`: a constraint, a condition in the write, an optimistic lock on `version`, a row lock (`FOR UPDATE` or `FOR SHARE`) in the writing transaction, or an idempotency key (`docs/03-standards/api-conventions.md`, rule 10). A read in the service followed by a write is not a mechanism. For each collision point, name the expected result of the concurrent test: which write wins, which error code the other gets, and the stored state. "None" needs a reason.

## 5. Schemas (Zod)
Names, fields, and rules only. Code goes in the feature's `schemas.ts`; the same schema serves the form and the server function.

| Schema | Input or output | Fields and rules | Used by (form, server function) |
|---|---|---|---|

## 6. Server functions and routes
| Name | Kind (server function · server route for external consumers) | Method | Purpose | Input schema | Output DTO | Auth / permission | Side effects (events, audit entries, cache keys to invalidate) |
|---|---|---|---|---|---|---|---|

List functions state their pagination shape and sortable fields (allow-list), per `docs/03-standards/api-conventions.md`.

**Errors.** Services return a `Result` with an `AppError` for each expected failure; unexpected failures are thrown and become one generic message at the server boundary (`docs/03-standards/error-handling.md`). The user-facing text is written in the UI layer from the code. One row per expected failure. A server route also states the HTTP status.

| Case | PRD EC id | `kind` | Code (in the feature's `errors.ts`) | What the user sees (UI behavior) |
|---|---|---|---|---|

## 7. Queries, mutations, and cache
Declared through `queryOptions` and the feature's key factory (`docs/04-stack/tanstack-query.md`). Loaders use `queryClient.query(...)`, never the deprecated imperative methods.

| Query options | Server function | Key (from key factory) | `staleTime` (or "default": 30 s, ADR 0007) | Used by (loader, component) |
|---|---|---|---|---|

| Mutation (hook) | Server function | Invalidates or updates | Optimistic? (rolls back on a thrown error and on `ok: false`, with a test for each) |
|---|---|---|---|

Queries whose result holds another feature's data joined on the server: each declares `meta.dependsOn` (`tanstack-query.md`, rule 12; ADR 0035). `n/a` when every such view renders the owner's query options.

| Query options | Owner feature and the data taken from it | `dependsOn` (the owner's scope) |
|---|---|---|

## 8. Routes and UI
**Navigation:** where a user reaches this from (sidebar item, tab, link on which page, direct URL only), which task adds that link (`07-tasks.md`, "Entry point visibility"), and who cannot see it.

**Pages and routes**

| Route (URL) | Title | Description | Search params (validated) | Loader prefetch (query options; blocking or streamed, `docs/02-architecture/data-fetching.md`) |
|---|---|---|---|---|

**Components** (the PRD's flows and designs are linked, not copied)

| Component | Location (`features/<f>/components/…` or `shared/ui`) | Description | Key props | Uses (primitives, hooks, forms, query options) | States (loading · empty · error · success) |
|---|---|---|---|---|---|

**Layout sketch** (UI features, tier M and L; "n/a" for no UI). If `03-prototype.md` has one, link it and note what changed. Otherwise one rough ASCII box drawing per page or panel: regions, the main content, the primary action, where empty, loading, and error states appear. It fixes the structure, not the styling.

```text
+--------------------------------------+
| header: title            [Primary]   |
+----------------+---------------------+
| filters        | table (rows)        |
|                | empty / error state |
+----------------+---------------------+
```

**Responsive behavior** (mobile-first; what changes, not a second design):

| Region | Small screen | Larger screen |
|---|---|---|

**State location** (every piece of state has exactly one home; server data is never copied into `useState`, `docs/04-stack/tanstack-query.md`):

| State | Home (server: Query key · URL: search param · form: TanStack Form · local: component state) | Why |
|---|---|---|

**Primitives from `shared/ui` needed:** list each, and whether it already exists in the repo (check `src/shared/ui`, not memory). Missing ones are added with the shadcn CLI and committed separately (`docs/04-stack/tailwind-shadcn.md`).

Accessibility notes: keyboard, focus, labels, contrast (from the PRD's accessibility requirements).

## 9. Security considerations
How the PRD's roles and permissions and its data classification, retention, and deletion rules are enforced (PRD section on permissions and data).

- **Authentication:** which functions and routes require sign-in.
- **Authorization:** the rule per function, enforced in the function or its middleware, not only in `beforeLoad`.
- **Input validation:** Zod schema at every boundary (section 5).
- **Cross-site requests:** server functions rely on the CSRF middleware in `src/start.ts`. A server route states whether it declares its own or authenticates each request instead (`docs/03-standards/api-conventions.md`, server route rule 6).
- **Data protection:** DTOs instead of rows, sensitive fields omitted, nothing sensitive in logs.
- **Retention and deletion:** the mechanism and its owner.
- **Tenant scoping and rate limits:** where they apply.

## 10. Non-functional requirements, observability, and risks
Performance targets, volumes, failure modes. Each risk: impact and mitigation. Name any heavy client code (editor, chart, large table) and how it loads (`docs/04-stack/tanstack-router.md`, rule 7); targets come from the PRD's NFRs, and no repo-wide budget exists (decision X).

- **Logging and audit:** what is logged and at what level, which events are audited; never secrets or personal data (`docs/03-standards/logging.md`).
- **Instrumentation for the PRD metrics:** for each metric in the PRD, what is recorded and where it can be read. If nothing can be measured yet, write "none yet": the Measure phase will then record **Unknown** and a follow-up is opened.

## 11. Test strategy (mapped to the PRD's acceptance criteria)
| Acceptance criterion or NFR (PRD id) | Level (unit / integration with real DB / component / e2e) | Test name or location |
|---|---|---|

Every AC and every NFR appears in this table (an NFR's verification from the PRD becomes a test, measurement, or manual check here). Persistence tests run against a real database (`docs/03-standards/testing.md`). Say which tests are written first (logic, bug fixes) and which are exempt (layout, config).

## 12. Rollout and rollback
How this reaches users: `main` reaches staging only, and production follows the Release gate (`docs/01-workflow/sdlc-pipeline.md`, section 3). Migration order. How to roll back, and whether the migration can be rolled back. Honors the PRD's rollout preference and rollback trigger. Platform-specific steps: `TODO(verify)` until the deploy platform steps are documented (runtime: Node in a container, ADR 0007).

## 13. Library APIs to be used (verified)
Start from the library table in `02-research.md`; list only the exact APIs this design calls. Check the installed `.d.ts` for `@deprecated`.

| Library@version | API | Source URL | Verified on |
|---|---|---|---|

## 14. Change log
After approval, any change is recorded here and re-approved at the Spec gate; the task breakdown is updated in the same change.

| Date | Change | Reason | Re-approved by |
|---|---|---|---|

## 15. Spec gate review
Filled by the reviewer (`docs/01-workflow/sdlc-pipeline.md`, section 4). Answer each question from this spec. "Yes" with nothing to point at counts as "no".

| Question | Answer and where |
|---|---|
| Is every in-scope PRD item placed in this spec, or removed through a change log? | |
| Does every Architecture Review decision and public export reach this spec (tier L)? | |
| Does the owning feature pass the qualification in section 2, with a stated boundary? | |
| Is every new public export, cross-feature call, table, and dependency listed, each new dependency with an ADR? | |
| Does every AC and NFR have a test in section 11? | |
| For a feature with UI: has a product owner reviewed section 8? | |
| Is authorization stated per function, and enforced outside `beforeLoad`? | |
| Can the migration and the release be rolled back, or is the reason it cannot accepted by name? | |
| Is any sentence true of any feature (`docs/03-standards/writing.md`)? | |

| Round | Date | Reviewer | Verdict (approve · approve with notes · changes requested · drop) | Findings, or notes and their owner |
|---|---|---|---|---|
