---
applies_to: "drizzle-orm and drizzle-kit 1.0.0-rc.5 (installed, pinned together), PostgreSQL 18 via node-postgres"
last_verified: 2026-11-06
verified_against: "installed drizzle-orm 1.0.0-rc.5 types (select.d.ts, select.types.d.ts, indexes.d.ts) and toSQL output; drizzle-kit 1.0.0-rc.5 generate; TypeScript 6.0.3 strict; PostgreSQL 18 docs sections 13.2.1, 13.3.2, 13.3.4, 13.4.2 via Context7 /websites/postgresql/18; not run on a PostgreSQL server (2026-11-06, ADR 0032)"
---

# Concurrency with Drizzle and PostgreSQL

**When to read:** before writing any write that two requests can make at once (a status change, a counter, a form two people can edit, a double submit), when filling the feature spec's section 4, "Transactions and concurrency", and when writing its concurrent test. Transactions and constraint errors, which this builds on: `drizzle-postgres.md`.

**Never decide a write from a plain read.** Under PostgreSQL's default level, Read Committed, two requests can both read "allowed" and both write. Put the condition in the write, or read under a row lock inside the transaction that writes, and turn PostgreSQL's answer into a `Result` (ADR 0032).

## Why the database decides

**Verified** in the PostgreSQL 18 docs, sections 13.2.1 and 13.3.2 (2026-11-06):

- An `UPDATE` or `DELETE` that finds a row another transaction is changing waits for that transaction, then **re-checks its `WHERE` against the committed row**. A condition in the `WHERE` is checked against the latest state; a check in TypeScript is not.
- `FOR UPDATE` blocks other `UPDATE`, `DELETE`, `FOR UPDATE`, and `FOR SHARE` on the row until the transaction ends. `FOR SHARE` blocks `UPDATE`, `DELETE`, and `FOR UPDATE`, and allows other `FOR SHARE`.

## Races and their mechanism

Pick the mechanism by the race. The feature spec names each collision point and its mechanism (section 4), and the task's test runs the colliding writes together and expects the result below (ADR 0031). Codes are examples; each feature declares its own in `errors.ts`.

| Race | Example | Mechanism | The concurrent test expects |
|---|---|---|---|
| Duplicate value | "Acme" and "ACME" created at once | Unique index, on `lower(...)` when case does not count (`docs/03-standards/database.md`, "Indexes"); conditional insert or `23505` | One `ok`, one `conflict` (`CUSTOMER_NAME_TAKEN`) |
| Delete while referenced | A customer deleted while an invoice is created for it | Foreign key `ON DELETE RESTRICT`; `23001` or `23503` | Delete fails with `conflict`, or the insert fails: never an orphan |
| Lost update | A and B edit one record in forms; B's save hides A's | Optimistic lock: `version` column, `UPDATE … WHERE id AND version` | One `ok`, one `conflict` (`INVOICE_VERSION_CONFLICT`); `version` went up once |
| Counter or balance | Two orders take the last item | Condition in the write: `SET stock = stock - n WHERE stock >= n` | One `ok`, one `conflict`; stock never below 0 |
| State transition | A sends an invoice while B pays it | Condition in the write (`WHERE status IN (…)`), or `.for('update')` and the rules function on the locked row | One `ok`, one `conflict` (`INVOICE_INVALID_STATUS`) |
| Write that depends on another row | An invoice created while its customer is deactivated | `.for('share')` on the referenced row in the writing transaction | Both finish in one order; no invoice for an inactive customer |
| Double submit or retry | One payment sent twice | Idempotency key with a unique index (`docs/03-standards/api-conventions.md`, rule 10) | One write; the second call returns the first result |

## Choosing between them

| Use | When |
|---|---|
| Condition in the write | The rule fits a `WHERE`. First choice: one statement, no lock held between statements |
| Optimistic lock (`version`) | A person edits between the read and the write (a form). Nothing is locked while they type; the form sends back the `version` it loaded |
| `.for('update')` | The decision needs the current row and a rule with branches (`*.rules.ts`). Lock, decide, write, commit |
| `.for('share')` | Another row, often another feature's, must stay as it is until this transaction commits. The owner exposes the locking read in `index.server.ts`, taking `tx` |

## Rules

1. **Lock inside the transaction that writes,** with `tx`. **Inferred** from the docs ("until the current transaction ends"): outside `db.transaction`, each statement is its own transaction, so the lock is gone before the write.
2. **Keep the transaction short.** No network call, email, or wait for a person inside it: every lock is held until commit.
3. **Lock several rows in one fixed order** (for example by `id`). PostgreSQL detects a deadlock and aborts one of the transactions, which one is not predictable (docs, section 13.3.4).
4. **`noWait` and `skipLocked`** exist in the installed types (`for(strength, { noWait: true })`). Use one only with a reason in the spec, such as a job queue.
5. **On a version conflict the UI does not retry with the new `version`**: that is the lost update again. It shows the text for the code and refetches the record (invalidate its query).
6. **Name the race in a comment** at the mechanism (`docs/03-standards/conventions.md`, "Comments").

## Examples

Optimistic lock. The second read only picks the error; it decides no write:

```ts
// features/invoices/server/invoices.repository.ts
export async function updateInvoiceNote(
  executor: DbOrTx,
  input: { id: string; ownerId: string; version: number; note: string },
): Promise<{ id: string; version: number } | undefined> {
  const [row] = await executor
    .update(invoices)
    .set({ note: input.note, version: sql`${invoices.version} + 1` })
    .where(and(
      eq(invoices.id, input.id),
      eq(invoices.ownerId, input.ownerId),
      eq(invoices.version, input.version),
    ))
    .returning({ id: invoices.id, version: invoices.version })
  return row
}

// features/invoices/server/invoices.service.ts
export async function saveInvoiceNote(
  input: { id: string; ownerId: string; version: number; note: string },
): Promise<Result<{ id: string; version: number }, InvoiceError>> {
  // Race: two saves of one form → optimistic lock on version (spec section 4).
  const saved = await updateInvoiceNote(db, input)
  if (saved) return ok(saved)
  const exists = await findInvoiceId(db, input.id, input.ownerId)
  return exists
    ? err(appError.conflict(INVOICE_ERROR.VERSION_CONFLICT, `invoice ${input.id} changed since version ${input.version}`))
    : err(appError.notFound(INVOICE_ERROR.NOT_FOUND, `invoice ${input.id} not found`))
}
```

Row lock. No write happens before the `err`, so a plain return is fine (`drizzle-postgres.md`, "Transactions"):

```ts
// features/invoices/server/invoices.repository.ts
export async function findInvoiceStatusForUpdate(tx: Tx, id: string, ownerId: string): Promise<InvoiceStatus | undefined> {
  const [row] = await tx
    .select({ status: invoices.status })
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.ownerId, ownerId)))
    .for('update')
  return row?.status
}

// features/invoices/server/invoices.service.ts
export async function sendInvoice(id: string, ownerId: string): Promise<Result<{ id: string }, InvoiceError>> {
  return db.transaction(async (tx) => {
    // Race: send and pay on one invoice at once → decide on the locked row (spec section 4).
    const status = await findInvoiceStatusForUpdate(tx, id, ownerId)
    if (!status) return err(appError.notFound(INVOICE_ERROR.NOT_FOUND, `invoice ${id} not found`))
    if (!canTransition(status, 'sent')) {
      return err(appError.conflict(INVOICE_ERROR.INVALID_STATUS, `invoice ${id} is ${status}`))
    }
    await setInvoiceStatus(tx, id, 'sent')
    return ok({ id })
  })
}
```

Checked on 2026-11-06 with drizzle-orm 1.0.0-rc.5 and TypeScript 6.0.3 strict: both snippets type-check, `.for(strength, config?)` is in the installed types, and `toSQL()` printed `… for update`, `… for share`, and `update "invoices" set …, "version" = "invoices"."version" + 1 where (… and ("invoices"."version" = $3)) returning …`. **Not run against PostgreSQL** (no server on that machine), and not run through this repo's lint gates: the first feature that uses each mechanism records its concurrent test output.

