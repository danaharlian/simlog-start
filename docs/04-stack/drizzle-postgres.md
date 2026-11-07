---
applies_to: "drizzle-orm and drizzle-kit 1.0.0-rc.5 (installed, pinned together), PostgreSQL via node-postgres"
last_verified: 2026-11-01
verified_against: "installed drizzle-orm and drizzle-kit 1.0.0-rc.5 (types, CLI help); Drizzle docs v0-v1-changes, relations, transactions, indexes pages via Context7 /websites/orm_drizzle_team; generate, migrate, queries, and transactions run on PostgreSQL 18.4 with pg 8.23.1, TypeScript 6.0.3 strict, and this repo's lint gates (2026-10-31, ADR 0014); node-postgres pool docs (2026-10-26)"
---

# Drizzle ORM + PostgreSQL

**When to read:** before writing a schema, query, migration, transaction, or DB config. Races between two requests: `drizzle-concurrency.md`. Table and migration conventions are in `docs/03-standards/database.md`.

**Version: the 1.0 release candidate** (`1.0.0-rc.5`, npm tag `rc`; npm `latest` is still 0.45.4). Decided in ADR 0008, which overrides the "stable 0.45.4" row of ADR 0007. A release candidate can still change: pin `drizzle-orm` and `drizzle-kit` to the **same exact version** (no caret), upgrade only through a branch that reads the release notes, and re-run the checks below. Docs for 0.x and for v1 coexist on the web; many answers, blog posts, and model memories describe 0.x. Match the installed version before trusting any example.

## Setup under the current lint gate

```ts
// drizzle.config.ts
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/features/*/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url }, // loading .env and choosing dev or test: environment.md, "drizzle.config.ts"
})

// shared/db/client.ts
const pool = new Pool({ connectionString, max: 10, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 5_000 })
export const db = drizzle({ client: pool })

export type Db = typeof db
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
export type DbOrTx = Db | Tx
```

Run with a feature schema using the `@/` alias: `drizzle-kit` resolved it through the glob.

**No schema aggregate and no relational queries (decision AA, ADR 0014).** Relational queries need `defineRelations` over every table, in code `shared/db/client.ts` can import. The boundary lint rejects `shared` importing a feature's `db/`, so `db.query.*` is not available, and allowing it would let any layer read any table with no import for lint to see. Repositories use `select` and joins within their own feature.

## Verified facts (1.0.0-rc.5)

- **drizzle-kit commands** (from `drizzle-kit --help`): `generate`, `migrate`, `pull`, `push`, `studio`, `up`, `check`, `export`, plus `skills` and `mcp` (ADR 0029: `docs/05-agent-tooling/skills.md` and `mcp.md`, which say what an agent may run). Migration layout has **one folder per migration and no `journal.json`** (v1 change). `drizzle-kit drop` was removed in v1.
- **`.defaultRandom()` on a `uuid` column generates `DEFAULT gen_random_uuid()`**, and it produced ids when run on PostgreSQL 18.4. **Inferred:** built into PostgreSQL 13 and newer; confirm against the production server version.
- `defineConfig` accepts `dialect`, `schema`, `out`, `dbCredentials.url`, and `migrations: { table, schema }` (Drizzle docs). Applied migrations are recorded in `drizzle.__drizzle_migrations` (observed).
- **Relational queries are v2 only.** v1 removed RQB v1: define relations with `defineRelations(schema, (r) => ({ ... }))` using `r.one.<table>` / `r.many.<table>` with `from` and `to`, and `through` for many-to-many (v0 used `relations()`, `fields`, `references`, and `relationName`, which is now `alias`). A `findFirst` with `where: { id }`, `columns`, and `with`, including `through`, ran correctly in a fixture; not used here (decision AA).
- Other documented v1 breaking changes that agents may trip on: `.array()` is no longer chainable (`.array('[][]')`); `generatedAlwaysAs()` takes only `` sql`…` `` or `() => sql`…``; the validator packages moved into `drizzle-orm` (`drizzle-orm/zod` replaces `drizzle-zod`). Not exercised here.

## Rules

1. **Schema as code**, owned per feature in `features/<f>/db/schema.ts`. `drizzle.config.ts` finds them through the glob above.
2. **Migrations:** `docs/03-standards/database.md`.
3. **`push` is for local prototyping only,** run by a person. Never by an agent, and never in CI, staging, or production.
4. **Single DB client** in `shared/db/client.ts`, reading `DATABASE_URL` through the env module. Driver: **node-postgres (`pg`)** on a Node container (ADR 0007, F and G). Pass **explicit pool options**, not the defaults: `pg` defaults are `max` 10, `idleTimeoutMillis` 10000, and `connectionTimeoutMillis` 0, which waits forever (Verified in the node-postgres pool docs, 2026-10-26). Starting values: `max` 10, `idleTimeoutMillis` 10000, `connectionTimeoutMillis` 5000 (a proposal, not measured). Keep container count times `max` below the server's connection limit, with headroom for migrations. Create the client once per process (module scope), never per request.
5. **Repository pattern:** only `*.repository.ts` imports the table objects. Services call repositories. A repository takes the executor as its first argument, so it runs inside or outside a transaction. UI and server function handlers never touch Drizzle directly.
6. **Transactions:** see the section below.
7. **Types** come from the schema; map rows to DTOs before returning from services (`database.md`).
8. **Column conventions:** `database.md`.
9. **Indexes:** `database.md`.
10. **Raw SQL** only via the `sql` template tag with interpolated **parameters**, never string concatenation.
11. **Seeds and fixtures:** `database.md`.
12. **Multi-tenant:** every query is tenant/owner-scoped in the repository; test cross-tenant isolation.
13. **Constraint errors:** see the section below. **Races:** `drizzle-concurrency.md`.
14. **Select only what is needed.** A repository names its columns; `db.select()` with no shape is for a table with nothing sensitive and a caller that uses every column. Scope in the same query (`docs/03-standards/security.md`, rule 6):

    ```ts
    const [row] = await executor
      .select({ id: invoices.id, status: invoices.status, total: invoices.total })
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.ownerId, ownerId)))
      .limit(1)
    ```

    Another owner's id returned `undefined` when run: "not yours" looks the same as "not found".
15. **Run independent reads together** with `Promise.all`. Each takes a pool connection, so keep the number small relative to `max` (rule 4). Inside a transaction it works but gains nothing, because there is one connection.
16. **Every list query has a limit:** a page size with a maximum (`docs/03-standards/api-conventions.md`). Sort on a unique tie-breaker as well, or rows repeat between pages.

## Lists

Both ran on real rows; the cursor pages did not overlap.

```ts
// Offset, for admin tables with a total
const where = eq(invoices.ownerId, ownerId)
const [items, total] = await Promise.all([
  executor.select({ id: invoices.id }).from(invoices).where(where)
    .orderBy(desc(invoices.createdAt), desc(invoices.id))
    .limit(pageSize).offset((page - 1) * pageSize),
  executor.$count(invoices, where),
])

// Cursor, the default: fetch one extra row to learn whether there is a next page
const rows = await executor.select({ id: invoices.id, createdAt: invoices.createdAt }).from(invoices)
  .where(and(
    eq(invoices.ownerId, ownerId),
    cursor ? or(
      lt(invoices.createdAt, cursor.createdAt),
      and(eq(invoices.createdAt, cursor.createdAt), lt(invoices.id, cursor.id)),
    ) : undefined,
  ))
  .orderBy(desc(invoices.createdAt), desc(invoices.id))
  .limit(limit + 1)
```

## Transactions

The service owns the boundary and passes `tx` to repositories, and to another feature's service from `index.server.ts`. `DbOrTx` is the handle type across features: `tx`, a nested `tx`, and `db` all type-check as an argument.

Run on PostgreSQL 18.4:

| Inside `db.transaction(async (tx) => ...)` | Result |
|---|---|
| The callback finishes | Commit |
| A thrown error | Rollback; the same error reaches the caller |
| `tx.rollback()` | Rollback; throws `TransactionRollbackError` |
| **`return err(...)` after a write** | **Commit: the write stays.** A returned `Result` never rolls back |
| A nested `tx.transaction(...)` throws, and the outer code catches it | Savepoint: only the inner work is undone |
| A query fails, and the code catches it and continues | **Every later statement fails with `25P02`** (transaction aborted) |
| A query on `db` instead of `tx` | Takes a **second connection**, outside the transaction. With `max: 1` it blocked until the pool timeout. Always use `tx` |
| Second argument `{ isolationLevel: 'serializable' }` | Accepted |

An expected failure after a write needs an explicit rollback. Type-checked, linted, and run, across two features:

```ts
// features/invoices/server/invoices.service.ts
export async function createInvoiceWithCustomer(
  email: string,
  total: number,
): Promise<Result<InvoiceSummary, InvoiceError>> {
  let failure: InvoiceError | undefined
  try {
    return await db.transaction(async (tx) => {
      const customer = await createCustomer(tx, email) // from @/features/customers/index.server
      if (!customer.ok) {
        failure = appError.conflict(INVOICE_ERROR.DUPLICATE_CUSTOMER, customer.error.message)
        return tx.rollback()
      }
      const invoice = await insertInvoice(tx, { customerId: customer.data.id, total })
      if (!invoice) throw new Error('insert returned no row')
      return ok(invoice)
    })
  } catch (cause) {
    if (cause instanceof TransactionRollbackError && failure) return err(failure)
    throw cause
  }
}
```

Write `return tx.rollback()`, not a bare call: without `return`, TypeScript does not narrow, and lint fails on the next line. When no write has happened yet, a plain `return err(...)` is fine and simpler.

## Constraint errors

**Prefer not catching.** A conditional insert reports a duplicate without an error, and it does not abort the transaction (observed):

```ts
const [row] = await executor
  .insert(customers)
  .values({ email })
  .onConflictDoNothing({ target: customers.email })
  .returning({ id: customers.id })
// row is undefined when the email exists: the service returns a `conflict`
```

When you must catch, a failed query throws `DrizzleQueryError` with the driver's error in `cause`. Its type is `Error`, so read the code through Zod, not a cast:

```ts
// shared/db/errors.ts
const pgErrorSchema = z.object({ code: z.string(), constraint: z.string().optional() })

export function readPgError(error: unknown): z.infer<typeof pgErrorSchema> | undefined {
  if (!(error instanceof DrizzleQueryError)) return undefined
  const parsed = pgErrorSchema.safeParse(error.cause)
  return parsed.success ? parsed.data : undefined
}
```

| Code | Means | Seen when |
|---|---|---|
| `23505` | Unique violation (`constraint` names the index) | Duplicate email |
| `23503` | Foreign key violation | Insert with a missing parent |
| `23001` | Restrict violation | Delete a parent under `ON DELETE RESTRICT` on 18.4. **Unknown** on older servers: accept `23503` too |
| `23514` | Check violation | A negative total |
| `25P02` | Transaction already aborted | Any statement after a caught failure |

In a transaction, catching alone is not enough: wrap the statement in a nested `tx.transaction(...)`, or the transaction stays aborted.

**Logging:** `DrizzleQueryError.message` holds the SQL, so it never goes to the client (`withErrorBoundary` replaces it). Log it under pino's `err` key, not `cause`: under `cause` the driver's `detail` is written out, and observed it contained `Key (email)=(pii@example.com) already exists` (`docs/03-standards/error-handling.md`, rule 11).

## Pitfalls

- Mixing docs from different Drizzle majors: relations, relational queries, migration layout, and validator packages differ between 0.x and v1.
- Using `relations()` / `fields` / `references` (v0 relational API) in v1 code.
- Editing generated SQL after it was applied elsewhere.
- Returning Drizzle rows directly through server functions.
- N+1 queries in loops; prefer joins or batched `inArray` queries.
- Upgrading one of `drizzle-orm` / `drizzle-kit` without the other.

## Verify before use

`casing` options, `migrations` config options, relational query filters beyond `where: { id }`, any `drizzle-kit` flag (`pnpm exec drizzle-kit <command> --help` prints the installed flags).
