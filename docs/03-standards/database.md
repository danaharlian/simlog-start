# Database Conventions

**When to read:** before designing a table, changing a schema, writing a migration, or adding a seed. Library facts, the client, transactions, and query rules are in `docs/04-stack/drizzle-postgres.md`. The steps are in skill `add-db-table`.

Behavior marked "Observed" ran on PostgreSQL 18.4 with Drizzle 1.0.0-rc.5 on 2026-10-31 (ADR 0014).

## Naming

| Element | Convention | Example |
|---|---|---|
| Table | plural `snake_case` in SQL, camelCase export | `invoice_lines`, `invoiceLines` |
| Column | `snake_case` in SQL, camelCase in TypeScript; always name it | `customerId: uuid('customer_id')` |
| Foreign key column | `<singular table>_id` | `customer_id` |
| Join table | both names, singular first | `invoice_tags` |
| Enum type | singular `snake_case` | `invoice_status` |
| Enum values | lowercase `snake_case`, the same strings as the TypeScript union | `draft`, `partly_paid` |
| Index | `<table>_<columns>_idx` | `invoices_customer_id_idx` |
| Unique index | `<table>_<columns>_key` | `customers_email_key` |
| Check constraint | `<table>_<rule>` | `invoices_total_nonnegative` |
| Migration | kebab-case `<action>-<entity>-<detail>` | `add-invoices`, `add-email-to-customers` |

## Standard columns

Every table has a primary key and timestamps, unless it is a join table.

```ts
// shared/db/columns.ts
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}
```

```ts
// features/invoices/db/schema.ts
export const invoiceStatus = pgEnum('invoice_status', invoiceStatuses)

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id').notNull(), // FK to customers.id: custom migration, see below
    status: invoiceStatus('status').notNull().default('draft'),
    total: integer('total').notNull(),
    ...timestamps,
  },
  (table) => [
    index('invoices_customer_id_idx').on(table.customerId),
    check('invoices_total_nonnegative', sql`${table.total} >= 0`),
  ],
)
```

| Rule | Detail |
|---|---|
| Primary key | `uuid('id').primaryKey().defaultRandom()` (ADR 0007, H) |
| Instants | `timestamp(..., { withTimezone: true })`, never without a zone |
| `updated_at` | `.$onUpdate` runs only for Drizzle's `update()`. Observed: raw SQL leaves the column unchanged, so set it yourself there |
| Nullability | `.notNull()` by default. A nullable column has a reason |
| Money | Integer minor units (`typescript.md`, rule 13) |
| Soft delete | Only if the PRD requires it |
| Exports | `db/schema.ts` **exports each table directly**. Observed: wrapped in an object, `drizzle-kit generate` exits 0 and creates no tables |
| `version` | `integer('version').notNull().default(1)` on a table people edit through a form, for the optimistic lock (`docs/04-stack/drizzle-concurrency.md`). Not in `timestamps`: other tables do not need it. An integer, not `updated_at`: raw SQL leaves `updated_at` unchanged (row above) |

## Enums

The list lives in the client-safe `schemas.ts`, so the form, the server function, and the table share it. `db/schema.ts` imports it (lint allows this).

```ts
// features/invoices/schemas.ts
export const invoiceStatuses = ['draft', 'sent', 'paid'] as const
export const invoiceStatusSchema = z.enum(invoiceStatuses)
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>
```

| Change | Generated SQL | Observed |
|---|---|---|
| Add a value | `ALTER TYPE ... ADD VALUE` | Applies |
| Remove a value | Column to `text`, `DROP TYPE`, recreate, cast back | **Fails if a row still holds the value**, and rolls back. Migrate the rows first, in an earlier migration |

Use `pgEnum` for a small, stable set. A list users or admins can extend is a table.

## Relations

- **`onDelete` is always explicit:** `restrict` when children must block the delete, `cascade` when they have no meaning alone (join rows), `set null` when the link is optional.
- **Index every foreign key column.** PostgreSQL does not create it for you.
- **Many-to-many:** an explicit join table with a composite primary key, plus an index on the second column. Give it its own `id` and timestamps only when the link has data of its own.

```ts
export const invoiceTags = pgTable(
  'invoice_tags',
  {
    invoiceId: uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.invoiceId, table.tagId] }),
    index('invoice_tags_tag_id_idx').on(table.tagId),
  ],
)
```

### Foreign keys across features

**Code holds only the id; the database holds the constraint** (decision AA, ADR 0014). `.references()` works only inside one feature, because the boundary lint rejects one feature's `db/schema.ts` importing another's. Declare the column without `.references()`, and when the table below calls for a foreign key, add it in a custom migration (`generate --custom`):

```sql
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT;
```

Observed: the constraint is enforced, and a later `generate` reports no changes and does not drop it. The foreign key does not appear in `db/schema.ts`, so leave a comment on the column.

A foreign key across features is a choice, recorded with its reason in the feature spec:

| Situation | Choose |
|---|---|
| A stable, core parent (tenant, user), where an orphan would be harmful | FK with `RESTRICT` |
| Financial or audit data | FK with `RESTRICT`, and no hard delete of the parent |
| The feature may become a separate service | No FK: the id, plus events |
| A very high-volume or partitioned table | Consider no FK; measure first, and add a reconciliation check |
| The parent may disappear but the history must stay | No FK, or keep a copy of the data needed |

- **Never `CASCADE` across features.** Removing another feature's data is a business decision: use `RESTRICT` or an event.
- **Never join or query another feature's table,** with or without a foreign key. Use its public API, with a batch function such as `getCustomersByIds(ids)` to avoid N+1 (`cross-feature-communication.md`).

## Indexes

- Add one for every foreign key and for each filter or sort a list query uses. Name the query in the feature spec.
- Composite: equality columns first, then the sort: `index(...).on(table.ownerId, table.createdAt.desc())`.
- `uniqueIndex` for anything that must be unique. The database is the guarantee; a check in the service is not: two requests can both pass it (`docs/04-stack/drizzle-concurrency.md`).
- Unique without regard to case: an index on the expression, ``uniqueIndex('customers_name_lower_key').on(sql`lower(${table.name})`)``. `generate` wrote `CREATE UNIQUE INDEX "customers_name_lower_key" ON "customers" (lower("name"));` (1.0.0-rc.5, 2026-11-06; not applied to a server).
- Justify with `EXPLAIN` on hot paths.

## Migrations

1. Change `db/schema.ts`.
2. `pnpm db:generate --name <name>` (`drizzle-kit generate`), or the MCP tool `generate` (`docs/05-agent-tooling/mcp.md`). It writes one folder: `drizzle/<timestamp>_<name>/` with `migration.sql` and `snapshot.json`.
3. **Read the SQL.**
4. Apply it locally: `pnpm db:migrate`.
5. Commit the schema and the whole folder together.

`push` is for local prototyping only, run by a person: never by an agent, and never in CI, staging, or production. Fix a merged migration forward with a new one; never edit it.

### What to look for when reading the SQL

| You see | Observed | Do |
|---|---|---|
| `ADD COLUMN ... NOT NULL` with no default | `generate` succeeds; **`migrate` fails on a table with rows**, and rolls back | Three migrations: add nullable, backfill (`generate --custom`), set `NOT NULL`. The sequence is **Inferred**, not run |
| A dropped and recreated type or column | Risk of data loss or failure | Human approval; split the change |
| A column you meant to rename | `generate` with no terminal **exits 2 and asks for `--hints`** | Pass the rename hint it prints. Never choose "create" for a rename: the data stays behind |
| `DROP` of anything | | Call it out in the PR for approval |

### Behavior worth knowing

- **One migration is atomic.** A failure in its second statement undid its first (observed), so re-running is safe.
- **`generate --custom --name <name>`** creates an empty `migration.sql` for a backfill or a constraint.
- **Two branches:** each has its own folder. A merged migration with an older timestamp than one already applied, and the same parent, still applied (observed), and `drizzle-kit check` passed. Order differs between environments: fresh databases run them by timestamp. Two branches touching the same table need a look.
- **A folder that sorts before its parent stops `migrate`,** with a message naming both. Rename it so it sorts after, only if it was never applied anywhere.
- **Running migrations in a deployed container:** `drizzle-kit migrate` and `migrate()` from `drizzle-orm/node-postgres/migrator` both worked. Which one deployment uses is part of the hosting setup (`tanstack-start.md`, rule 11).

## Seeds

- **Idempotent:** safe to run twice. Use a natural key:

  ```ts
  await db
    .insert(customers)
    .values({ email: 'demo@example.com', name: 'Demo' })
    .onConflictDoUpdate({ target: customers.email, set: { name: 'Demo' } })
  ```

- Separate from migrations. Never run in production. Never real user data or real credentials.
- Reference data every environment needs (a list of countries) is a migration (`generate --custom`), not a seed.
- **The runner is not decided** (open decision AB): a TypeScript seed needs something to run it, and a new dependency needs an ADR.

## Types

Types flow from the schema; do not write them twice.

| Need | Use | Not |
|---|---|---|
| A row | `typeof invoices.$inferSelect` | `type Invoice = { id: string; ... }` |
| An insert | `typeof invoices.$inferInsert` | A copy of the columns |
| A subset | `Pick<InvoiceRow, 'id' \| 'status'>` | A new type by hand |
| Input from the client | `z.infer<typeof schema>` in `schemas.ts` | The row type |
| Data sent to the client | A DTO mapped in the repository or service | The row itself |

Row types stay inside the feature's server code. They are never exported through `index.ts` or `index.server.ts` (`cross-feature-communication.md`).

## Checked by

Lint: repositories alone reach tables, and no feature imports another's `db/`. Review: naming, indexes, `onDelete`, and reading the SQL. Tests: constraints and owner scoping against real PostgreSQL (`testing.md`, rule 1).
