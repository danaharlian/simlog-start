# API Conventions (Server Functions and Server Routes)

**When to read:** before adding or changing any server function, endpoint, webhook, or DTO.

The code shapes on this page were type-checked (TypeScript 6.0.3 strict), built, and called through the built server's `fetch` on 2026-10-31 (Start 1.169.4, Zod 4.6.7; ADR 0010). `requireAuth` and the service names are illustrative. Confirm exact APIs against the docs for the installed version.

## Choosing the mechanism

**Default: a server function** (same-origin RPC for the app itself, `docs/04-stack/tanstack-start.md`). Use a server route only when something needs an HTTP address of its own. How a read loads (loader, streaming, polling): `docs/02-architecture/data-fetching.md`.

| Scenario | Use | Why |
|---|---|---|
| Page data | Server function, through `queryOptions` in a loader | Typed RPC, shared cache |
| Form submit, mutation from our UI | Server function | Typed input and output; same schema as the form |
| Typed streaming to our own UI | Server function (Start's streaming guide) | Same RPC model; `TODO(verify)` the API when first used |
| Webhook from a third party | Server route | The caller needs a URL and signs the raw body |
| Public or partner REST API | Server route, versioned `/api/v1/...` | Standard HTTP contract |
| Cron or external trigger | Server route, authenticated with a secret from env | The caller needs a URL |
| File upload | Server route. **Inferred**, not tested: it gives control over size before the body is read. Small forms may use `FormData` in a server function (documented by Start). The route declares its own CSRF middleware (rule 6 below) | Body control |

## Server function rules

1. Live in `features/<f>/server/<name>.functions.ts`. Business logic goes in the service, not in the handler.
2. **Always** declare input validation with a Zod schema from the feature's `schemas.ts` (`.validator(...)`). No inline ad-hoc validators for non-trivial input. Schema conventions: `docs/04-stack/zod.md`.
3. **Always** apply authentication/authorization middleware (or an equivalent in-handler check) for any function that reads or writes non-public data. Route `beforeLoad` guards are UX only.
4. Method: `GET` for reads, `POST` for mutations. Never perform writes in `GET`. A `GET` carries its input in the URL (`?payload=...`, observed): a read whose input holds a secret or personal data uses `POST`.
5. Names are verbs: `listInvoices`, `getInvoice`, `createInvoice`, `updateInvoice`, `deleteInvoice`, `markInvoicePaid`.
6. Return **DTOs**, not DB rows. DTOs are serializable and contain only what the client needs (no password hashes, internal flags, other tenants' data).
7. Sorting/filtering inputs are allow-lists (enum of sortable fields), never raw column names from the client.
8. Mutations return a `Result` whose `data` is the updated resource (or its id) so the client can update/invalidate caches deterministically. Expected failures are the `error` side of the `Result` (`docs/03-standards/error-handling.md`).
9. **A server function does not call another server function to share logic.** Start allows the call, but here a handler only validates, authorizes, and calls a service: move the shared logic into a service function and call that from both.
10. Idempotency: operations that may be retried (payments, emails) accept an idempotency key and enforce it in the service.
11. **Cache headers**: responses that depend on identity MUST NOT be `public`; use `private`/`no-store` as the Start docs describe.

## Who does what in a mutation

| Step | Where | Failure |
|---|---|---|
| 1. Authenticate, authorize | Middleware | `unauthorized`, `forbidden` |
| 2. Validate input | `.validator(schema)` | Thrown: a client bug or tampering, because the form uses the same schema |
| 3. Apply business rules, write (transaction) | Service, through the repository | `Result` with an `AppError` |
| 4. Publish events, after the write is saved | Service | Handler failures never fail the publisher (`cross-feature-communication.md`) |
| 5. Return a DTO | Service → handler | |
| 6. Invalidate the cache, only when `data.ok` | `useMutation` hook on the client | The hook branches on `data.ok` |

```ts
// features/invoices/server/invoices.functions.ts
export const createInvoice = createServerFn({ method: 'POST' })
  .middleware([requireAuth])
  .validator(createInvoiceSchema)
  .handler(({ data, context }) =>
    withErrorBoundary('invoices.create', () => createInvoiceForUser(context.user, data)),
  )
```

## Server route rules (external endpoints)

1. A file in `src/routes/` with a `server` property is a server route (`src/routes/api/v1/invoices.ts` serves `/api/v1/invoices`). Export only the methods the endpoint supports. Keep it thin, like any route.
2. Authenticate every request unless the endpoint is deliberately public: a signature for webhooks (verify it before parsing the body), a token for APIs.
3. Validate query and body with Zod `safeParse`. Query strings arrive as text, so use `z.coerce` (`zod.md`). Never `Number(searchParams.get('page'))`.
4. Run the handler inside `withRouteBoundary`, and answer with the helpers below. Do not invent per-endpoint shapes.
5. Document each endpoint in the owning feature's `README.md`. Version public APIs (`/api/v1/...`). Rate-limit public endpoints.
6. **CSRF:** a route called only by our own UI adds `server: { middleware: [createCsrfMiddleware()], handlers }`. A webhook, public API, or cron route does not, and relies on rule 2 (`docs/04-stack/tanstack-start.md`).

**How a route reaches a feature (ADR 0012):** a route serving our logged-in UI calls a server function from `index.ts`, whose middleware handles the session. A webhook or cron route under `src/routes/api/**` has no session: it may import a service from `index.server.ts`, and **must authenticate each request itself**. It passes `await request.text()` and the signature header to one service function, which verifies the signature over the raw body, parses with Zod (handle malformed JSON, or it becomes a 500), rejects duplicates by event id, saves in a transaction, and only then returns success. Never reach into feature internals. No UI in these files.

```ts
// src/routes/api/v1/invoices.ts
import { createFileRoute } from '@tanstack/react-router'
import { listInvoices, listInvoicesQuerySchema } from '@/features/invoices'
import {
  invalidInputResponse,
  resultResponse,
  withRouteBoundary,
} from '@/shared/server/http-response'

export const Route = createFileRoute('/api/v1/invoices')({
  server: {
    handlers: {
      GET: ({ request }) =>
        withRouteBoundary('invoices.list', async () => {
          const query = Object.fromEntries(new URL(request.url).searchParams)
          const parsed = listInvoicesQuerySchema.safeParse(query)
          if (!parsed.success) return invalidInputResponse(parsed.error)
          return resultResponse(await listInvoices({ data: parsed.data }))
        }),
    },
  },
})
```

## Response shape (server routes only)

The HTTP status says whether the call succeeded, so the body has no `success` flag. Server functions do not use this shape: they return a `Result` with `200`.

```jsonc
// Success (2xx)
{ "data": { "id": "..." } }

// Success, paginated
{ "data": { "items": [], "page": 1, "pageSize": 20, "total": 100 } }

// Failure (4xx, 5xx); fieldErrors only for validation, keyed by dotted path ("items.0.sku");
// formErrors only for input that fails Zod, holding cross-field errors with no field
{ "error": { "code": "INVOICE_NOT_FOUND", "message": "...", "formErrors": [], "fieldErrors": { "email": ["..."] } } }
```

## HTTP status codes

| Code | When | Comes from |
|---|---|---|
| `200` | Successful read or update | `resultResponse(result)` |
| `201` | A resource was created | `resultResponse(result, 201)` |
| `204` | Success with no body | `new Response(null, { status: 204 })` |
| `400` | Malformed input, or `validation` | `invalidInputResponse`, `errorResponse` |
| `401` / `403` | `unauthorized` / `forbidden` | `errorResponse` |
| `404` / `409` | `not_found` / `conflict` | `errorResponse` |
| `429` | Rate limit exceeded | The rate limiter; not an `AppError` kind |
| `500` | Unexpected failure, generic message only | `withRouteBoundary` |

## The route helpers

The server-route counterpart of `withErrorBoundary`. A new `AppError` kind fails typecheck here until it has a status.

```ts
// shared/server/http-response.ts
import { zodErrorDetails } from '@/shared/errors'
import type { ZodError } from 'zod'
import type { AppError, Result } from '@/shared/errors'

const statusByKind = {
  validation: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
} satisfies Record<AppError['kind'], number>

export function errorResponse(error: AppError): Response {
  const fieldErrors = error.kind === 'validation' ? { fieldErrors: error.fieldErrors } : {}
  return Response.json(
    { error: { code: error.code, message: error.message, ...fieldErrors } },
    { status: statusByKind[error.kind] },
  )
}

export function invalidInputResponse(error: ZodError): Response {
  return Response.json(
    { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', ...zodErrorDetails(error) } },
    { status: 400 },
  )
}

export function resultResponse<T>(result: Result<T>, status = 200): Response {
  return result.ok ? Response.json({ data: result.data }, { status }) : errorResponse(result.error)
}

export async function withRouteBoundary(
  operation: string,
  run: () => Promise<Response>,
): Promise<Response> {
  try {
    return await run()
  } catch (cause) {
    logger.error({ operation, err: cause }, 'unexpected failure') // docs/03-standards/logging.md
    return Response.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Try again.' } },
      { status: 500 },
    )
  }
}
```

## Pagination

Never return unbounded lists. Cursor-based by default for unbounded lists; offset only for admin tables with total counts.

| Style | Input | Output |
|---|---|---|
| Cursor | `cursor`, `limit` (default 20, max 100) | `{ items, nextCursor }` |
| Offset | `page` (from 1, default 1), `pageSize` (default 20, max 100) | `{ items, page, pageSize, total }` |

```ts
// shared/lib/pagination.ts
export const pageParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

// features/invoices/schemas.ts
export const listInvoicesQuerySchema = pageParamsSchema.extend({
  sortBy: z.enum(['createdAt', 'total']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})
```
