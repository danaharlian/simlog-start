# 0011 Reference template comparison: coding standards, components, and conventions

- Status: accepted (decision Z resolved by ADR 0013)
- Date: 2026-10-31
- Deciders: owner asked for our own version and for missing items to be added; the choices below are the agent's and can be reversed by a new ADR
- Extends: ADR 0006, ADR 0007, ADR 0009, ADR 0010

## Context

The owner supplied `CODING_STANDARDS.md`, `COMPONENTS.md`, and `CONVENTIONS.md` from a Next.js project (Server Actions, Prisma, Server Components, react-hook-form, Radix, React Table v8) as references, usable in part or in full.

Facts checked on 2026-10-31 in a fixture: React 19.3.1, Form 1.33.5, Table 9.3.1, Query 5.105.0, Zod 4.6.7, Drizzle 1.0.0-rc.5, TypeScript 6.0.3 strict, Vitest 5.0.5, jsdom 30.1.3, Testing Library React 16.3.3, with this repo's `eslint.boundaries.js` and `eslint.no-suppress.js` after `@tanstack/eslint-config` 0.4.0. Final state: `tsc` clean, `eslint --max-warnings 0` clean, 8 of 8 tests passed.

1. **A `withForm` section breaks once the form adds `validators.onSubmitAsync`.** The form's type no longer matches the section's, even when both spread the same `formOptions`. A typed stub in the options failed too. **`withFieldGroup` type-checks**, and a wrong name in its `fields` map is a type error.
2. **A field's `state.meta.errors` is `any` through `useFieldContext`.** Reading `.message` fails `no-unsafe-member-access`. Accepting it as `ReadonlyArray<unknown>` and parsing with Zod passes.
3. **A server error sent as a string disappears when the field reads `{ message }`.** A test caught it. `toFormErrors` now turns each message into `{ message }`, so client and server errors share one shape.
4. **The full submit path works in a DOM test:** `useMutation` in `onSubmitAsync`, ok result resets through the shared mapper, field error reaches its field, other errors show as a form banner, and a field listener clears a dependent field.
5. **Lint rejects** `string[]` and `readonly string[]`, `import { a, type B }`, `import('x').Y` types, shorthand method signatures, and a `render` function named like its constant. It does **not** reject a default export.
6. **Import order after `eslint --fix`** in the fixture: relative, then types, then `@/` last. The reference's "shared before local" order fails `import/order`.
7. **`components/sections/` and `components/<x>-form-values.ts` get the UI layer rules:** importing a service or another feature's repository is an error. A new `features/x/utils/` folder importing a service gets **no** boundary error.
8. **Shape checks:** generic `DataTable<TFeatures, TData>` over `ReactTable`, the status lookup table, the compound component with `use`, and a Drizzle `select({...})` with `and(eq(id), eq(ownerId))` all type-check.
9. **A pure rule inside a service cannot be tested without env,** given an env module that validates on import. With no `DATABASE_URL`, the test of a pure function in `*.service.ts` fails with a `ZodError` while loading service, repository, db client, and env; the same function in its own file passes. Under the current gate, a `server/*.rules.ts` file gets no layer rules: importing a repository or `db/`, and being imported by UI, raise no boundary error. A trial `rules` category, in the fixture's copy of the gate only, rejected all of those and still allowed service to rules, test to rules, and rules to `schemas.ts` and `errors.ts`.
10. **The shadcn docs moved** (Context7 `/websites/ui_shadcn`): there is a TanStack Form guide and a v9 data-table guide, so the claim in `tanstack-form.md` that its form guidance targets another library was stale. Its samples still contain `as string`, `T[]`, `min-h-[120px]`, and `"use client"`, which our rules reject.

## Decision

### Adopted or adapted

| From the reference | Adapted to | Now in |
|---|---|---|
| Five fundamental rules, priority order | Same idea, with two entry points in place of `contract.ts` | `coding-standards.md` (new) |
| Boundary-aware DRY, extract vs duplicate, SSOT | Kept; "use the event bus" replaced by the owner's public API | `coding-standards.md` |
| Status machine as a pure function | Kept as a function in `*.service.ts`; lookup with `satisfies` | `coding-standards.md` |
| Symbol naming, comments, TODO format | Kept; each row says who checks it | `conventions.md` (new) |
| Component rules, props, compound pattern | `type` props, `ComponentProps`, flat exports | `components.md` (new) |
| LOC target and limit, decomposition, dependency direction | Target 150, split over 200; review-checked | `components.md` |
| Server vs client decision matrix | Replaced by SSR-safe render rules | `components.md` |
| Three-layer form, single mapper, payload helper | TanStack Form: `createFormHook`, `withFieldGroup`, `listeners` | `tanstack-form.md` |
| Data table vs basic table, shared shell, placement | v9 API; the shell waits for a second table | `tanstack-table.md` |
| No arbitrary values, CSS variables for sizes, no `@apply` in components | v4 syntax; generated primitives and variant selectors exempt | `tailwind-shadcn.md` |
| Ownership at query level, least privilege, explicit `select` | Rule plus a type-checked example | `security.md`, `drizzle-postgres.md` |
| Parallel independent reads | Kept, with the pool size caveat | `drizzle-postgres.md` |
| Gate order | Adapted to our script names | `linting-and-formatting.md` |
| `as const`, utility types | Added as rules | `typescript.md` |
| Test priority | Added above the pyramid | `testing.md` |

### Not adopted

| From the reference | Why |
|---|---|
| react-hook-form, `zodResolver`, `Control`, `watch`, `useEffect` sync | Not in the stack. Listeners replace effect-based sync |
| `useReactTable`, `getCoreRowModel`, `ColumnDef<T>[]` | v8 API; removed in v9 (ADR 0008) |
| Five prebuilt `data-table-*` files | Abstraction gate: build the shell at the second table |
| `"use client"`, Server Components | Next.js only |
| Radix, shadcn MCP steps | Base UI is installed; shadcn MCP not adopted (ADR 0007, N) |
| `utils/`, `domain/`, `types/`, `constants/`, `stores/` in a feature | Outside lint categories (fact 7); ADR 0007, V; ADR 0010 |
| `contract.ts`, "read through the event bus" | ADR 0009. An event cannot return data |
| "No barrels" as written | Our two entry points are the barrels; narrowed in `conventions.md` |
| `interface` with static compound properties | The repo uses `type`; shadcn generates flat exports |
| Prescribed import groups and Prettier values | Lint and `.prettierrc` decide (fact 6) |
| `_tag`, `success`, `format:check` | ADR 0006; our script is `check` |
| "Never" arbitrary values, with no exception | Generated primitives and `calc()` layouts use them; would force editing primitives |
| Hard LOC limit as a gate | Changing a gate needs a human; review checks it |

## Consequences

- New decision **Z**: whether pure business rules deserve a linted file of their own. Resolved by ADR 0013.
- `toFormErrors` now has a documented body. Field errors have one shape.
- The sample in `error-handling.md` used `readonly string[]`, which fails lint; corrected.
- **Owner decision (2026-10-31): import order uses `import/order`.** ADR 0003 named `simple-import-sort`, which was in neither `versions.md` nor the installer; it is not adopted.
- Size guidelines and naming rows marked "Review" are not enforced by a tool.

## Not verified

- A real shadcn `Field`, `Table`, or Base UI primitive: the fixture used plain elements for both forms and tables. Its `FieldError` accepting `{ message }` comes from the guide's use of `field.state.meta.errors`, not from a generated file.
- The form under SSR and hydration in a real Start app: tested in jsdom only. `ClientOnly` and `useHydrated` are from the Start guide and were not run.
- Focus moving to the first error on a failed submit (`tanstack-form.md`, rule 5).
- The table in a browser, and the Drizzle query against a database: types only.
- Tailwind `@theme` and `w-(--x)`: read in the v4 docs, not built.

## Alternatives considered

- **Copy the three files in, renamed to the stack.** They exceed the 200-line budget, repeat existing docs, and rest on react-hook-form and Table v8. Rejected.
- **Put everything in existing files.** Symbol naming, component rules, and the principles had no natural home; three short new files keep the task-based loading. Stack-specific parts still went to `04-stack`.
- **`withForm` with a stub validator,** to match the official first example. It did not type-check (fact 1).
- **A `*.rules.ts` file for pure rules.** It needs a new lint category, which is a gate change. Left as decision Z.

## Verification

Docs consulted (2026-10-31): `@tanstack/react-form`: form-composition, listeners guides, `FormApi.reset` source (Context7 `/tanstack/form`). `shadcn`: docs/forms/tanstack-form, docs/components/radix/data-table (Context7 `/websites/ui_shadcn`). `tailwindcss` v4: upgrade guide, adding-custom-styles (Context7 `/tailwindlabs/tailwindcss.com`). `@tanstack/react-start`: execution-model, hydration-errors (Context7 `/websites/tanstack_start_framework_react`). Installed `@tanstack/eslint-config` 0.4.0 source and type declarations, through the fixture run above.
