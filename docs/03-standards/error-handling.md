# Error Handling

**When to read:** when throwing, catching, mapping, logging, or displaying errors, and when writing the error table of a feature spec.

Decided in ADR 0006. Short version: **expected failures are plain objects returned as a `Result`; unexpected failures are thrown and become one generic message at the server boundary.** No error classes.

## Why not classes (Verified, serializer level)

TanStack Start serializes an error thrown inside a server function with its `ShallowErrorPlugin`: only the `message` crosses the network, and the client receives a plain `Error`. So `error.code`, `error.details`, and `instanceof AppError` do not survive the trip. Plain objects do survive (round trip run on 2026-10-26 with seroval 1.7.2 and `@tanstack/router-core` 1.171.39 / `start-client-core` 1.170.39). **Not yet confirmed in a running Start app**: when the first server function ships, add a test that calls it and asserts the `Result` shape on the client.

## Two kinds of failure

| | Expected (domain) failure | Unexpected failure |
|---|---|---|
| Examples | invoice already paid, email taken, not allowed, record missing | database down, bug, bad config |
| Carried as | `Result` with an `AppError` (plain object) | a thrown error |
| Who creates it | the service (`appError.*` factories) | anyone, by accident |
| Crosses the network as | normal data (`{ ok: false, error }`) | one generic message |
| The user sees | text chosen by the UI from `error.code` | "Something went wrong" |
| Logged | not as an error (it is a normal outcome) | once, by `withErrorBoundary`, with pino |
| Stack trace | none: an `AppError` is a plain object | kept in the log, under pino's `err` key |

An expected failure gives no stack to follow, by design (ADR 0021). Its `code` is what you search for, so keep codes unique and put the id in `message` (`invoice ${id} not found`). If the path to a failure matters for debugging, it is probably unexpected: let it throw.

Framework control flow is neither: `redirect()` and `notFound()` are thrown by the framework's own mechanism and pass through `withErrorBoundary` untouched (`isRedirect`, `isNotFound` are exported by `@tanstack/react-router`; Verified in 1.170.46).

## The model

`src/shared/errors/` (these files, the feature `errors.ts`, the service, and the boundary were type-checked together in a fixture on TypeScript 6.0.3 strict, 2026-10-27; snippets below omit imports):

```ts
// shared/errors/app-error.ts
export type FieldErrors = Readonly<Record<string, ReadonlyArray<string>>>

type Base<TKind extends string, TCode extends string> = {
  readonly kind: TKind
  readonly code: TCode // stable string the UI switches on, for example INVOICE_ALREADY_PAID
  readonly message: string // for logs and developers; the UI shows its own text chosen by `code`
}

export type AppError<TCode extends string = string> =
  | (Base<'validation', TCode> & { readonly fieldErrors: FieldErrors })
  | Base<'unauthorized', TCode>
  | Base<'forbidden', TCode>
  | Base<'not_found', TCode>
  | Base<'conflict', TCode>

export const appError = {
  validation: <TCode extends string>(code: TCode, message: string, fieldErrors: FieldErrors = {}): AppError<TCode> => ({
    kind: 'validation', code, message, fieldErrors,
  }),
  unauthorized: <TCode extends string>(code: TCode, message: string): AppError<TCode> => ({ kind: 'unauthorized', code, message }),
  forbidden: <TCode extends string>(code: TCode, message: string): AppError<TCode> => ({ kind: 'forbidden', code, message }),
  notFound: <TCode extends string>(code: TCode, message: string): AppError<TCode> => ({ kind: 'not_found', code, message }),
  conflict: <TCode extends string>(code: TCode, message: string): AppError<TCode> => ({ kind: 'conflict', code, message }),
}
```

```ts
// shared/errors/result.ts
export type Ok<T> = { readonly ok: true; readonly data: T }
export type Err<TError> = { readonly ok: false; readonly error: TError }
export type Result<T, TError = AppError> = Ok<T> | Err<TError>
export const ok = <T>(data: T): Ok<T> => ({ ok: true, data })
export const err = <TError>(error: TError): Err<TError> => ({ ok: false, error })
```

```ts
// shared/errors/to-form-errors.ts  (each message becomes { message }: the same shape a Zod issue has at a field)
export type FormErrors = {
  readonly form?: string
  readonly fields: Readonly<Record<string, ReadonlyArray<{ readonly message: string }>>>
}

export function toFormErrors(error: AppError): FormErrors {
  if (error.kind !== 'validation') return { form: error.message, fields: {} }
  const fields = Object.entries(error.fieldErrors).map(
    ([name, messages]) => [name, messages.map((message) => ({ message }))] as const,
  )
  return { fields: Object.fromEntries(fields) }
}
```

`shared/errors/index.ts` exports `appError`, `ok`, `err`, `toFormErrors`, `zodErrorDetails` (`docs/04-stack/zod.md`), and the types. Do not add a kind without an ADR: every `switch` on `kind` in the app must be revisited.

| `kind` | Use for | HTTP status (only for server routes and webhooks; server functions return `200` with a `Result`) |
|---|---|---|
| `validation` | input the service rejects, with `fieldErrors` | 400 |
| `unauthorized` | no valid session | 401 |
| `forbidden` | session valid, not allowed | 403 |
| `not_found` | record missing or not visible to this user | 404 |
| `conflict` | state clash (already paid, duplicate) | 409 |

Server routes turn these into responses with the helpers in `docs/03-standards/api-conventions.md` (`errorResponse`, `withRouteBoundary`, the counterpart of `withErrorBoundary`).

## Where codes live (decision U, ADR 0006)

Each feature declares its codes in **`src/features/<feature>/errors.ts`**: constants and types only, no imports from `server/`, `db/`, or UI (lint-enforced by the `errors` category in `docs/examples/eslint.boundaries.js`; negative-tested on a fixture).

```ts
// features/invoices/errors.ts
import type { AppError } from '@/shared/errors'

export const INVOICE_ERROR = {
  ALREADY_PAID: 'INVOICE_ALREADY_PAID',
  NOT_FOUND: 'INVOICE_NOT_FOUND',
} as const

export type InvoiceErrorCode = (typeof INVOICE_ERROR)[keyof typeof INVOICE_ERROR]
export type InvoiceError = AppError<InvoiceErrorCode>
```

Add a **code** for each failure the UI must tell apart (`INVOICE_ALREADY_PAID`); reuse an existing `kind` for its category (`conflict`). A code carries no extra fields: put what the UI needs in the DTO or the `message`.

The feature's `index.ts` re-exports the codes and types that other features or routes need. Another feature never imports `errors.ts` directly (the boundary rule rejects it). Codes are globally unique and prefixed with the feature name.

User-facing text lives in the UI as an exhaustive map, so a new code fails typecheck until its text exists (tested on the fixture):

```ts
// features/invoices/components/invoice-error-messages.ts
export const invoiceErrorMessages: Record<InvoiceErrorCode, string> = {
  [INVOICE_ERROR.ALREADY_PAID]: 'This invoice is already paid.',
  [INVOICE_ERROR.NOT_FOUND]: 'We could not find this invoice.',
}
```

## Layers

```ts
// server/invoices.service.ts  (a function, not a class)
export async function payInvoice(id: string): Promise<Result<InvoiceRow, InvoiceError>> {
  // Race: two payments of one invoice → the condition is in the UPDATE (drizzle-concurrency.md).
  const paid = await invoicesRepository.markPaidIfUnpaid(id) // UPDATE … WHERE id AND NOT paid RETURNING …
  if (paid) return ok(paid)
  const invoice = await invoicesRepository.findById(id) // picks the error only; decides no write
  if (!invoice) return err(appError.notFound(INVOICE_ERROR.NOT_FOUND, `invoice ${id} not found`))
  return err(appError.conflict(INVOICE_ERROR.ALREADY_PAID, `invoice ${id} already paid`))
}

// server/invoices.functions.ts  (validate + authorize + call service, wrapped by the boundary)
export const payInvoiceFn = (id: string) => withErrorBoundary('invoices.pay', () => payInvoice(id))
```

The skeleton above shows the shape only; the real `createServerFn` chain (method, middleware, validator) comes from `docs/04-stack/tanstack-start.md` and skill `add-server-function`.

```ts
// shared/server/with-error-boundary.ts
import { isNotFound, isRedirect } from '@tanstack/react-router'

export async function withErrorBoundary<T>(operation: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (cause) {
    if (isRedirect(cause) || isNotFound(cause)) throw cause
    logger.error({ operation, err: cause }, 'unexpected failure')
    throw new Error('Something went wrong. Try again.')
  }
}
```

`logger` comes from `shared/server/logger.server.ts` (`logging.md`). Whether Start already hides thrown messages in production builds is **Unknown**; the boundary does not depend on it.

## Rules

1. **Services return `Result` for every expected failure.** They never return `null`/`undefined` to mean "error", never throw for a domain outcome, and never throw strings.
2. **Repositories** return data and let driver errors propagate. A known constraint violation becomes a `conflict` in the **service**. Prefer a conditional insert, which needs no catch; otherwise read the code with `readPgError` (`docs/04-stack/drizzle-postgres.md`, "Constraint errors"). **Inside a transaction, a returned `Result` does not roll back:** after a write, use `tx.rollback()` (same document, "Transactions").
3. **Server functions** validate input with Zod, authorize, call the service, and wrap the call in `withErrorBoundary`. Input that fails the Zod validator is a client bug or tampering (the client validates with the same schema): it is an unexpected failure, not a `Result`. Field errors that need server knowledge (email taken) come from the service as `validation` or `conflict`.
4. **Never leak internals**: no stack, SQL, table or column names in `message` of anything that crosses the network. `AppError.message` is written by us and must be safe to show in a log and safe to send; do not interpolate raw driver text.
5. **Mutations and forms** read `data.ok`. A `Result` with `ok: false` is a **successful** call to TanStack Query: it does not retry and does not run `onError`. Invalidate queries and show success only when `data.ok`; otherwise show the error (see below).
6. **Reads** return a `Result` when the UI renders a specific state for the failure (for example "invoice not found"); the component branches on `data.ok`. For plain "no such page" use `notFound()` and the route's `notFoundComponent`; for "sign in" use `redirect()`.
7. **UI**: route-level `errorComponent` and `notFoundComponent` at root and per major section catch unexpected failures. Expected failures are handled where they happen, with text from the feature's message map. Switch on `error.kind` or `error.code`; **never** test `instanceof` on our own errors (there are no classes).
8. **Forms:** map a `validation` error to field errors with `toFormErrors(error)` inside `validators.onSubmitAsync`, which returns `{ form, fields }` (Verified in the TanStack Form validation guide on 2026-10-26 through the framework-agnostic docs; the React page was not re-read). Non-field errors show as a banner from `form`.
9. **Never swallow.** No empty `catch`. Catch only to (a) translate, (b) add context and rethrow, or (c) recover with a documented fallback. Narrow a caught `unknown` with `instanceof Error` only for built-in errors.
10. **Preserve `cause`** when wrapping an unexpected error: `new Error('…', { cause })`.
11. **Logging**: unexpected failures are logged **once**, at `withErrorBoundary`, under pino's `err` key. Everything else about logging: `logging.md`.
12. **Event handlers** (`*.listeners.ts`, in-process) never fail the publisher: the bus logs a throwing handler once and continues. A handler follows the same rules as a server function (call the service; expected failures are `Result`s and are handled or logged, never thrown). A reaction that must not fail silently is not an in-process event (`docs/02-architecture/cross-feature-communication.md`).
13. **Retry** only idempotent operations, with bounded attempts and backoff. TanStack Query retry applies to thrown errors only (the unexpected path); an `ok: false` result is never retried.

## Checklist when adding an error path

- [ ] Expected or unexpected? Expected means a code in `errors.ts`, an `appError.*` in the service, and a text in the UI message map.
- [ ] Which `kind`? Does the spec's error table row name the PRD edge case?
- [ ] Is there a test asserting the `Result` (kind and code) from the service?
- [ ] Does the mutation or form branch on `data.ok`?
- [ ] No class, no `instanceof` on our errors, no internals in `message`.
