---
applies_to: "zod v4 line"
last_verified: 2026-10-31
verified_against: "Context7 /colinhacks/zod versions list; TanStack Form and Start docs; zod.dev/v4/changelog and runs against zod 4.6.7 (2026-10-31)"
---

# Zod

**When to read:** before writing any schema, validator, env parser, or inferred type.

## Verified facts

- Imported as `import { z } from 'zod'` in the TanStack Start and Form docs.
- Zod is used as a **Standard Schema**: TanStack Form accepts it directly (needs Zod ≥ 3.24); Start server functions accept a schema in `.validator(...)`.
- Context7 lists Zod v3.x and v4.x releases. Some APIs differ between majors (for example string-format helpers). **Verify against the installed major** before writing schemas from memory.

## Rules

1. **Validate at every boundary:** server function input, env vars, route search params, form values, webhook payloads, external API responses, `JSON.parse` results.
2. **Schemas live in the feature's `schemas.ts`**, client-safe (no server imports). Types are inferred (`z.infer<typeof schema>`), never re-declared by hand.
3. **Separate input and output schemas** when transforms/coercion/defaults are used; name them explicitly (`createInvoiceInputSchema`, `invoiceDtoSchema`).
4. **Be strict about unknown keys** on inputs that map to writes (reject or strip deliberately, document which).
5. **Error messages:** schema messages are developer-readable codes or short text; user-facing localization happens in the UI layer. Provide `path` info so forms can map errors to fields.
6. **Reuse and compose** (`pick`, `omit`, `extend`) instead of copy-pasting object shapes. `.merge()` is deprecated in v4.
7. **Refinements** (`refine`/`superRefine`) keep cross-field rules next to the schema and have tests.
8. **Do not use `z.any()`**; prefer `z.unknown()` and narrow. Give every user-supplied string a `.max()`, so input size is bounded.
9. **Env schema** lives in `shared/config/` and fails fast (see `docs/03-standards/environment.md`).
10. **Parse, do not assert:** use `parse`/`safeParse` results; never cast to the inferred type.

## Create, update, and list schemas

These go in the same `schemas.ts`. Each one parsed against 4.6.7 on 2026-10-31.

```ts
const invoiceFields = z.object({
  customerName: z.string().trim().min(1).max(100), // trim first
  email: z.email().toLowerCase(),
  currency: z.string(),
})

// Create: defaults belong here only
export const createInvoiceSchema = invoiceFields.extend({ currency: z.string().default('IDR') })

// Update: partial of the base without defaults
export const updateInvoiceSchema = invoiceFields.partial()

// List: query strings arrive as text; see shared/lib/pagination.ts in api-conventions.md
export const listInvoicesQuerySchema = pageParamsSchema.extend({
  sortBy: z.enum(['createdAt', 'total']).default('createdAt'),
})

export type CreateInvoice = z.infer<typeof createInvoiceSchema>
```

| Trap (observed) | Result | Write instead |
|---|---|---|
| `z.string().min(1).trim()` | `"   "` passes and becomes `""`: checks run in order | `z.string().trim().min(1)` |
| `createSchema.partial()` when create has defaults | Update parses `{ name }` to `{ name, currency: 'IDR' }`, **overwriting stored values** | `.partial()` on a base with no defaults |
| `z.coerce.boolean()` on a query string | `"false"` becomes `true` | `z.stringbool()` |
| `z.coerce.number()` on `""` | Becomes `0` | Add `.positive()` or a minimum that rejects it |
| `z.coerce.number()` on a missing key | Fails in v4 | `.default(n)` to declare the fallback |
| `z.string().email()` | Works, but deprecated in v4 | `z.email()` |

`z.coerce` is for text input (query strings, `FormData`). Router search params go through the validation API in `tanstack-router.md`; do not assume they are text.

## Turning a `ZodError` into a response

Use this helper for a server route's `400` (`docs/03-standards/api-conventions.md`). Tested, type-checked, and linted on 2026-10-31.

```ts
// shared/errors/zod-errors.ts
import type { ZodError } from 'zod'

export type ZodErrorDetails = {
  readonly formErrors: ReadonlyArray<string>
  readonly fieldErrors: Readonly<Record<string, ReadonlyArray<string>>>
}

export function zodErrorDetails(error: ZodError): ZodErrorDetails {
  const formErrors: Array<string> = []
  const fieldErrors: Record<string, Array<string>> = {}
  for (const issue of error.issues) {
    if (issue.path.length === 0) {
      formErrors.push(issue.message)
      continue
    }
    const key = issue.path.map(String).join('.')
    const existing = fieldErrors[key]
    if (existing) existing.push(issue.message)
    else fieldErrors[key] = [issue.message]
  }
  return { formErrors, fieldErrors }
}
```

| Instead of | Because (observed on 4.6.7) |
|---|---|
| `z.flattenError(error).fieldErrors` | Drops a cross-field `refine` with no `path`: the caller gets `{}`. Nested errors collapse to the top key: `nested.c` becomes `nested`, `items.0.sku` becomes `items` |
| `error.flatten()`, `error.format()` | Marked `@deprecated` in the installed types |
| `issue.path.join('.')` | A path may hold a symbol, and `join` throws on one. `map(String)` does not |

**Give a cross-field `refine` a `path`** when one field is at fault (`{ path: ['confirmPassword'] }`), so a form can show it there. `z.treeifyError` suits nested diagnostic logs, as long as the values logged are safe (`docs/03-standards/logging.md`).

## Pitfalls

- Mixing v3 and v4 idioms in one codebase.
- Schemas depending on server-only modules (breaks client bundle).
- Form default values that do not match the schema's input type.

## Verify before use

Installed major version; string/number format helpers; coercion; discriminated unions; error formatting helpers; Standard Schema interop version requirements of Form/Router.
