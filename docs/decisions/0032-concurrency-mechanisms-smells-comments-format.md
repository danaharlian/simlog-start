# 0032 Concurrency mechanisms, review smells, traceable comments, and fixed display format

- Status: accepted
- Date: 2026-11-06
- Deciders: owner approved the four changes proposed after comparing three reference documents (`code-smells.md`, `comments.md`, `concurrency.md`), and chose locale `id-ID` and time zone `Asia/Jakarta`; the wording and placement are the agent's and can be reversed by a new ADR
- Extends: ADR 0031, ADR 0013, ADR 0006

## Context

The owner supplied three reference documents from another template. Most of their content was already here, often stricter: complexity limits (`design-principles.md`), why-comments and no commented-out code (`conventions.md`), no swallowed errors (`error-handling.md`, rule 9), lookup tables over `switch`, constraint error codes and the conditional insert (`drizzle-postgres.md`), `ON DELETE RESTRICT` (`database.md`), and concurrent tests against a real database (ADR 0031).

Read in this repo on 2026-11-06, these gaps remained:

- **The repo taught check-then-write.** `coding-standards.md` said "the service fetches what the rule needs, calls it", with no lock. The feature spec, `qa.md`, and `code-review` pass 4 listed "a status check inside the transaction" as a mechanism. Under Read Committed, PostgreSQL's default, a plain `SELECT` takes no row lock, so two transactions can both pass that check. The `payInvoice` example in `error-handling.md` read, checked `paid`, then wrote.
- **No lost-update guidance.** No document named a `version` column, optimistic locking, `FOR UPDATE`, or `FOR SHARE`. ADR 0031 tests a mechanism but nothing said how to choose one.
- **Concurrency tests clashed with `testing.md` rule 1,** which isolates each test in a rolled-back transaction: colliding calls need committed rows and a connection each.
- **`TODO(<topic>)`** pointed to no tracked work.
- **The review smell list** covered structure only, not code-level smells.
- **No rule fixed the locale and time zone of displayed text,** although every component also renders on the server.

## Decision

1. **Concurrency.** A new stack document, `docs/04-stack/drizzle-concurrency.md`: never decide a write from a plain read; a race table (duplicate, delete while referenced, lost update, counter, state transition, dependent write, double submit) with mechanism and the expected concurrent test result; when to use a condition in the write, a `version` column, `.for('update')`, or `.for('share')`; lock inside the writing transaction, keep it short, lock in a fixed order; on a version conflict the UI refetches and never retries on its own. `database.md` adds the `version` column and the case-insensitive unique index. The feature spec, `qa.md`, `coding-standards.md`, `code-review` pass 4, and the `payInvoice` example drop "status check inside the transaction". `testing.md` gains rule 1b for concurrent tests. `AGENTS.md` lists check-then-write as a rule no gate catches.
2. **Comments.** `conventions.md`: a `Race:` comment at each collision point's mechanism; a comment on code that looks wrong but was checked; link a rule instead of restating it; follow-up `TODO(<slug>/T<n>)` or the tier S issue id, and no `TODO` without one. `TODO(verify)` is unchanged.
3. **Smells.** The review list in `design-principles.md` becomes a table of smell, example, and remedy, adding check-then-write, speculative generality, boolean flag parameters, feature envy, shotgun surgery, magic values, and a hidden clock or locale. `code-review` pass 9 and skill `refactor` point to it; a check-then-write goes to `fix-bug`, not `refactor`, because the fix changes behavior.
4. **Display format.** Dates and numbers in markup go through `shared/lib/format.ts`, with locale `id-ID` and time zone `Asia/Jakarta` (`components.md`, "Dates and numbers in markup"). Money formatting waits for open decision AG.

Not adopted from the reference: `TaggedError` with `_tag` (ADR 0006 uses plain objects with `kind`), a `domain/` folder (`folder-structure.md`; ADR 0013 uses `*.rules.ts`), a lint rule for magic numbers (changing `eslint*.js` needs a human), `getServerEnv()` and the reference's file names and rule ids, and a 40-line function limit (this repo's 50 stays). A temporary QA probe in place of a kept test: ADR 0031 keeps the test.

Added: `docs/04-stack/drizzle-concurrency.md`. Changed: `AGENTS.md`, `docs/README.md`, `docs/04-stack/drizzle-postgres.md` (links), `docs/03-standards/database.md`, `coding-standards.md`, `error-handling.md`, `conventions.md`, `testing.md`, `components.md`, `linting-and-formatting.md`, `docs/02-architecture/design-principles.md`, `docs/templates/feature-spec.md`, `docs/templates/qa.md`, skills `code-review` and `refactor`.

## Consequences

- **A form that edits a record needs a `version` column,** a migration, and `version` in its update schema and form state. Existing tables are not changed by this ADR; a feature adds the column when it builds or touches such a form.
- **Row locks can deadlock or queue.** Fixed lock order, short transactions, and no network call inside them limit this; nothing enforces them, review checks.
- **A concurrent test can pass by timing** with check-then-write code. Review of the mechanism (`code-review` pass 4) stays the main check; `linting-and-formatting.md` lists it as uncaught.
- **The display time zone is one value for every user.** A user outside WIB sees WIB times. A per-user zone would need the zone known on the server before render, and a new ADR.
- **A `TODO` needs a task or issue first.** Small follow-ups that do not deserve one become why-comments or nothing.
- **No check enforces any of this.** `check-docs` does not read code, and no lint rule was added.

## Not verified

- **No mechanism ran on a PostgreSQL server:** no server or Docker was on the machine. Their behavior rests on the PostgreSQL 18 docs; the Drizzle code was type-checked and its SQL printed with `toSQL()`. The first feature that uses each mechanism records its concurrent test output.
- That a lock taken outside `db.transaction` is released before the next statement: **Inferred** from the docs' "until the current transaction ends".
- That 10 concurrent calls expose a check-then-write in a typical test run (`testing.md`, rule 1b): **Inferred**, not measured.
- The edited `payInvoice` example in `error-handling.md` was not re-run with that document's fixture; its repository calls are illustrative, as before.
- The snippets were not run through this repo's lint gates, only TypeScript strict.
- Which minor unit of IDR is stored: **Unknown**, open decision AG.
- That `useHydrated()` avoids the mismatch for "now" and relative time: the Start guide says so; not run here (`components.md` already notes this).

## Alternatives considered

- **A section in `drizzle-postgres.md`.** Tried first; it took that file from 196 to 300 lines, over the 200-line budget `check-docs` warns on, and progressive disclosure says to split by task (`docs/00-principles/progressive-disclosure.md`). The new file sits beside it in `04-stack/` because its rules are Drizzle code (`tx`, `.for()`, `returning`), not a standard independent of the library.
- **Optimistic locking on `updated_at`.** Rejected: `$onUpdate` runs only for Drizzle's `update()`, and raw SQL left the column unchanged (`database.md`, observed).
- **Always `SERIALIZABLE`.** Rejected for now: it moves the race into serialization failures that every write must retry, and no retry helper exists. The `isolationLevel` option is accepted by Drizzle (`drizzle-postgres.md`), so a feature can choose it with a reason.
- **A lint rule or script for `toLocaleString()` and `TODO` format.** It would enforce the display format and the `TODO` format, but a new rule or `check:*` script needs a human (`AGENTS.md`). Left for later, if review misses one.
- **Leave the locale open.** Rejected by the owner, who chose `id-ID` and `Asia/Jakarta`.

## Verification

Docs consulted (2026-11-06):

- PostgreSQL 18: Read Committed (section 13.2.1), row-level lock modes and conflicts (13.3.2), deadlocks (13.3.4), application-level consistency with explicit locks (13.4.2): https://www.postgresql.org/docs/18/transaction-iso.html, https://www.postgresql.org/docs/18/explicit-locking.html, https://www.postgresql.org/docs/18/applevel-consistency.html, through Context7 `/websites/postgresql/18`.
- drizzle-orm@1.0.0-rc.5: `for(strength: LockStrength, config?: LockConfig)` with `LockStrength = 'update' | 'no key update' | 'share' | 'key share'` and `noWait` / `skipLocked`, read in the installed `pg-core/query-builders/select.d.ts` and `select.types.d.ts`; `uniqueIndex().on()` accepts `SQL` (`pg-core/indexes.d.ts`). Context7 `/websites/orm_drizzle_team` had no page for row locks.
- drizzle-kit@1.0.0-rc.5: `generate` wrote `CREATE UNIQUE INDEX "customers_name_lower_key" ON "customers" (lower("name"));` and `"version" integer DEFAULT 1 NOT NULL`.
- TypeScript 6.0.3 strict (with `noUncheckedIndexedAccess`) type-checked every snippet in `drizzle-concurrency.md` and `shared/lib/format.ts`, with pg 8.23.1.
- React docs, `hydrateRoot` caveats: https://react.dev/reference/react-dom/client/hydrateRoot, through Context7 `/reactjs/react.dev`.
- Node 24.22.1 `Intl`: outputs quoted in `components.md`, run with the machine's zone (Asia/Jakarta) and with `TZ=UTC`.
