# TypeScript Standards

**When to read:** before writing or reviewing any TypeScript. Blocked by an error? Read [`no-suppression.md`](no-suppression.md) first.

## Compiler baseline (`tsconfig.json`)

MUST enable: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, `isolatedModules`. Consider `exactOptionalPropertyTypes` once the codebase is clean. Path alias setup follows TanStack Start's "Path Aliases" guide and the Vite config in the installed version.

## Rules

1. **No `any`**, explicit or leaked (`JSON.parse`, `catch`, untyped libs). Use `unknown` and narrow, or parse with Zod. Library gaps: typed adapter or `.d.ts`, never a cast.
2. **No non-null assertion `!`.** Handle the null case or prove it with a guard.
3. **No narrowing `as`.** Allowed: `as const`, `satisfies`, and upcasts. Banned: `as unknown as X`, `<X>value`, `{} as X`, `unknown as X`, `Base as Derived`. A justification comment does not make a cast legal; lint rejects it.
4. **No `@ts-ignore`, `@ts-expect-error`, or `@ts-nocheck`. No `eslint-disable` of any form.** There is no inline exception. See [`no-suppression.md`](no-suppression.md) for what to do instead and how it is enforced.
5. **Validate at boundaries**: server function input, env, search params, form values, external API responses, `JSON.parse`. Infer types from schemas (`z.infer`), do not hand-write duplicates.
6. **Prefer unions over enums.** Use string-literal unions or `as const` objects. A `switch` on a union lists every variant: lint rejects a missing case, and a catch-all `default` does not count (`switch-exhaustiveness-check`, ADR 0021). A `never` check adds a runtime failure for a value the types did not predict. A `switch` on a plain `string` may use `default`.
7. **Model states explicitly** with discriminated unions instead of boolean flags (`status: 'idle' | 'loading' | 'error'`).
8. **`import type`** on its own line for type-only imports. No `import { a, type B }` and no inline `import('x').Y` types (lint rejects both; list in [`conventions.md`](conventions.md)).
9. **`satisfies`** to check shape without widening (configs, route search validators, lookup tables). **`as const`** for constant objects and arrays; together: `{...} as const satisfies Record<Status, string>`.
10. **Exported functions have explicit return types** unless trivially inferred from a single return of a typed value. Public APIs of features (`index.ts`, `index.server.ts`) always do.
11. **No default exports** except where the framework requires them. Named exports keep refactors and auto-imports reliable.
12. **Immutability by default**: `const`, `readonly` arrays/properties on public types, no mutation of function arguments.
13. **Dates and money**: store instants as UTC (`timestamptz`); never use floating point for money (integer minor units or a decimal library chosen via ADR).
14. **Generic constraints over loose generics.** If a generic needs three type parameters, rethink the API.
15. **No `class` in application code.** Use functions, plain objects, and closures. Lint rejects `ClassDeclaration` and `ClassExpression` (`eslint.no-suppress.js`; the integrity script checks the selectors are still present). Using a library's class (`new Date()`, `new Error()`, `new Pool()`) is fine; declaring one is not. Main reason: Start serializes a thrown error as its message only, so a custom error class loses its fields between server and client (`docs/03-standards/error-handling.md`).
16. **Discriminate unions with `kind`** (`AppError`) or `ok` (`Result`), as string literals, so `switch` narrows without casts. One discriminant name per concept; do not invent `_tag`, `type`, or `status` variants for the same idea.
17. **`instanceof` only for built-ins and library classes** (`Error`, `Date`, `ZodError`). Never to tell our own errors apart: switch on `kind` or `code`. Review checks this; no lint rule enforces it.
18. **Derive, do not retype.** Use `Pick`, `Omit`, `Partial`, `ReturnType`, and `z.infer` over a hand-written copy of a type that already exists.

## Which feature for which job

**Required** applies wherever the need comes up, and leaving it out is a review finding. **When useful** is only for removing real duplication; if a reader needs a comment to follow a type, simplify it.

| Need | Use | Priority |
|---|---|---|
| A type derived from another | `Pick`, `Omit`, `Partial`, `ReturnType`, `Awaited`, `Parameters`, `T['key']`, `keyof T` | Required |
| A value with variants | A discriminated union and an exhaustive `switch` | Required |
| Fixed values | `as const`; `typeof X[number]` for the union | Required |
| A structured string | A template literal type: `` `${Entity}.${'created' \| 'paid'}` `` | Required |
| Checking a value without widening it | `satisfies` | Required |
| Unknown input | Zod. A type guard for a simple shape | Required |
| A reusable library-like helper | Constrained generics, conditional types, `infer`, mapped types | When useful |
| Return type depends on the argument | Function overloads, if a union or generic cannot express it | When useful |
| Extending a library's types | `declare module`, as a library's docs direct (the `Register` interface, for example) | When useful |

Use `type` for object shapes, as the rest of the repo does (ADR 0011). Lint accepts `interface` too (checked), so review keeps this consistent.

## Instead of a class

| A class would give | Use | Example |
|---|---|---|
| An object with methods | A `create` factory returning a plain object | `createRateLimiter` below |
| Private state | Variables captured by the factory's closure | `used` below |
| `instanceof` on our own types | A `kind` or `ok` discriminant, or a type guard | `isRole` below |
| Thrown domain errors | A returned `Result` | `error-handling.md` |
| An error hierarchy | The `AppError` union; a feature adds a code, not a subclass | `error-handling.md` |
| A base class for shared behavior | A plain function the callers call. An interface needs two real uses (`design-principles.md`) | |

```ts
// shared/lib/create-rate-limiter.ts
export type RateLimiter = {
  readonly tryAcquire: (key: string) => boolean
  readonly reset: (key: string) => void
}

export function createRateLimiter(limit: number): RateLimiter {
  const used = new Map<string, number>()
  return {
    tryAcquire: (key) => {
      const count = used.get(key) ?? 0
      if (count >= limit) return false
      used.set(key, count + 1)
      return true
    },
    reset: (key) => {
      used.delete(key)
    },
  }
}
```

A constructor function is no way around the ban: `new` on a plain function fails `tsc` (TS7009) and lint (`no-unsafe-assignment`) (ADR 0021).

## Patterns that pass the gates

Type-checked and linted with this repo's configs on 2026-10-31 (ADR 0015; `createRateLimiter` above: ADR 0021).

```ts
// shared/lib/exhaustive-check.ts
export function exhaustiveCheck(value: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(value)}`)
}

// A new variant now fails typecheck here
function statusLabel(status: PaymentStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'completed':
      return 'Completed'
    default:
      return exhaustiveCheck(status)
  }
}

// A type guard over a constant list, with an annotation in place of a cast
export const ROLES = ['admin', 'member'] as const
export type Role = (typeof ROLES)[number]

export function isRole(value: string): value is Role {
  const roles: ReadonlyArray<string> = ROLES
  return roles.includes(value)
}

// An assertion function, for a broken invariant only. An expected missing value is a Result
export function assertDefined<TValue>(
  value: TValue | null | undefined,
  message: string,
): asserts value is TValue {
  if (value === null || value === undefined) throw new Error(message)
}

// A generic in place of `obj[key as keyof T]`
export function getProperty<TObj, TKey extends keyof TObj>(obj: TObj, key: TKey): TObj[TKey] {
  return obj[key]
}
```

When the compiler complains, work in this order: understand the mismatch, fix the wrong type or signature, narrow, add a generic, model it as a union, parse with Zod. A cast is never on the list (`no-suppression.md`).

## Type design for the stack

- Types flow from sources of truth: DB schema (Drizzle `$inferSelect` / `$inferInsert`) → DTO mapping → Zod schemas for I/O → UI. Do not leak DB row types across the network boundary.
- Server function input/output must be serializable; Start enforces this in strict mode by default. Do not turn strict serialization off without an ADR.
- Route params and search params get their types from TanStack Router. Never build URLs with string concatenation; use typed `Link`/`navigate`.
