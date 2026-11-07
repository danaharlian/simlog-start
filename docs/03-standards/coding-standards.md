# Coding Standards

**When to read:** before writing or reviewing code in a feature for the first time, when two rules seem to conflict, or when deciding whether to reuse or repeat code. This page states the principles; the table at the end says where each detail lives.

## Five rules

Every coding decision passes these. They are what makes this a feature-driven modular monolith, not just a folder layout.

1. **The feature is the primary boundary.** Code is grouped by business capability, not by technical layer.
2. **A feature owns its business rules and its tables.** Nobody else computes its rules or queries its data.
3. **A feature's internals are private.** Others use its two entry points, `index.ts` and `index.server.ts`, or react to its events (`docs/02-architecture/cross-feature-communication.md`).
4. **`shared` holds only what is truly cross-feature.** It never knows a feature exists and never holds a business rule.
5. **Each piece of business knowledge has one owner** (table below).

The aim behind all five: **a person or agent should be able to predict where a file is and what it looks like before opening it.**

## When principles conflict

Prefer in this order: **predictability, then consistency, then readability, then cleverness.**

| Principle | Means | Example |
|---|---|---|
| Predictability | The location and shape of code can be guessed | Every server function is validate, authorize, call service |
| Consistency | One problem, one solution | Expected failures are always a `Result`, never sometimes a throw |
| Readability | Optimize for the reader | A named helper over a clever one-liner |
| Explicitness | Intent is visible | Named exports, explicit return types on a feature's public API |

Correctness, security, and the gates are not part of this trade. A more predictable design that fails `lint` is not an option (`no-suppression.md`).

## Named principles

Where each common principle lives in this repo, and what checks it. A rule here wins over the textbook reading of the name.

| Principle | In this repo | Checked by |
|---|---|---|
| Readability | The order above; names by business concept (`conventions.md`, "Naming symbols") | Review |
| Maintainability | Complexity limits (`docs/02-architecture/design-principles.md`) | Lint for function and file length, nesting, parameters; review for feature size |
| DRY (don't repeat yourself) | One owner for each piece of **knowledge** (below). Code that only looks alike may repeat: "Repeating code" | Review |
| KISS (keep it simple) | No abstraction without two real uses; no `class`; no interface around a single repository (`design-principles.md`, "The gate for any abstraction") | Lint for `class`; review |
| YAGNI (you aren't gonna need it) | No speculative option, parameter, generic, or export (`design-principles.md`, "Speculative generality"; `conventions.md`, "Exports") | Review |
| Single responsibility | One reason to change per unit (`design-principles.md`, "S: Single Responsibility") | Lint for layer boundaries; review |
| Separation of concerns | Layers `UI → function → service → repository → db` and `routes → features → shared` (`docs/02-architecture/modular-monolith.md`) | Lint (`boundaries/dependencies`), `check:gates` |
| No magic numbers or strings | A named constant in its owner; error codes in `errors.ts`; Tailwind values from tokens | Lint (`no-magic-numbers`), `check:ui`; review for strings |
| Folder structure | `docs/02-architecture/folder-structure.md` | `check:gates` |
| Comments | Why, not what (`conventions.md`, "Comments") | Review |
| Tests | `testing.md` | `test`; review for what is missing |

## Repeating code

**Duplicate first, understand second, abstract third.** Two similar pieces are not yet a pattern; a wrong abstraction costs more than a copy. The gate for adding an interface or base class is in `docs/02-architecture/design-principles.md`.

| Two features need… | Do | Why |
|---|---|---|
| The same generic utility (format a date) | Extract to `shared/lib` | No business meaning |
| The same generic UI | Extract to `shared/ui` | Presentation only |
| Similar but not identical Zod schemas | Keep both | They diverge as the rules change |
| Similar business rules that are really separate | Keep both | Each belongs to its own feature |
| The **same** business rule or data | One feature owns it; the other calls its public API | One source of truth |

An event cannot replace that last call: an event returns nothing. Reads and answers go through the owner's public API; events only announce what happened.

When in doubt, do not abstract. Merging two copies later is cheaper than untangling one wrong abstraction.

## One owner for each piece of knowledge

| Knowledge | Owner | Wrong |
|---|---|---|
| Pricing formula | `features/billing/server/pricing.rules.ts` | A copy in `features/orders` |
| Status transitions | The owning feature's `*.rules.ts` or `*.service.ts` | Hard-coded in a component or a server function |
| Input rules | The feature's `schemas.ts`, used by both form and server function | One schema per side |
| Error codes and their text | `errors.ts` and the UI message map (`error-handling.md`) | Literal strings at each use |
| Roles | The auth feature, exported from its `index.ts` | Redefined in each feature |
| Form defaults and edit values | One mapper function (`docs/04-stack/tanstack-form.md`) | Separate objects for create and edit |
| Tables | The owner's `db/schema.ts` | Another feature's query |
| Locale and time zone of displayed dates and numbers | `shared/lib/format.ts` (`components.md`, "Dates and numbers in markup") | `toLocaleString()` with no arguments, or a locale literal at each call |

## Business rules

Rules belong to the owning feature; a `domain/` folder is not used. A rule of a line or two stays in `*.service.ts`. A rule with several branches or edge cases **may** go in `server/<name>.rules.ts` (ADR 0013): pure functions that take time, ids, and data as arguments, with no I/O. The service fetches what the rule needs, calls it, and turns the answer into a `Result`. When the answer decides a write, fetch with a row lock inside the writing transaction, or put the condition in the write itself: a plain read before a write lets two requests pass the same check (`docs/04-stack/drizzle-concurrency.md`). Lookup tables beat long `if` chains, and the compiler reports a missing case:

```ts
// features/invoices/server/invoices.rules.ts
export type InvoiceStatus = 'draft' | 'sent' | 'paid'

const VALID_TRANSITIONS = {
  draft: ['sent'],
  sent: ['paid'],
  paid: [],
} as const satisfies Record<InvoiceStatus, ReadonlyArray<InvoiceStatus>>

export function canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  const allowed: ReadonlyArray<InvoiceStatus> = VALID_TRANSITIONS[from]
  return allowed.includes(to)
}
```

- Never move a rule to `shared` because two callers want it. Keep it in the owner and export it through `index.server.ts`.
- **The UI cannot import a service**, so it does not re-implement the rule. The server returns the answer in the DTO (`canPay: true`), and the service enforces it again on the write.
- **Why a separate file (checked, ADR 0013):** a test importing a service also loads its repository, the db client, and the env module, so with an env module that validates on import it fails unless env is set. A `*.rules.ts` test needs no database, env, or mocks.
- **Lint enforces the imports:** a rules file may use its own `errors.ts`, `schemas.ts`, other rules, `shared/lib`, and `shared/errors`, and only the service, `index.server.ts`, and tests may import it. Lint cannot see packages, `Date.now()`, or `fetch`: review checks those.

## Where the detail lives

| Topic | Document |
|---|---|
| Modules, layers, dependency direction | `docs/02-architecture/modular-monolith.md` |
| Folders, file names, "where does it go" | `docs/02-architecture/folder-structure.md` |
| Abstractions, SOLID, complexity limits, splitting a feature | `docs/02-architecture/design-principles.md` |
| Feature calls and events | `docs/02-architecture/cross-feature-communication.md` |
| Where a value is stored; caching | `docs/02-architecture/state-management.md` |
| Naming symbols, imports, comments, formatting | `conventions.md` |
| Components | `components.md` |
| Forms | `docs/04-stack/tanstack-form.md` |
| Data tables | `docs/04-stack/tanstack-table.md` |
| Styling and primitives | `docs/04-stack/tailwind-shadcn.md` |
| TypeScript | `typescript.md`, `no-suppression.md` |
| Failures, status codes | `error-handling.md`, `api-conventions.md` |
| Logging | `logging.md` |
| Environment variables | `environment.md` |
| What a term means in code | `glossary.md` |
| Choosing how data is read or changed | `docs/02-architecture/data-fetching.md` |
| Tables, migrations, seeds | `database.md` |
| Queries, transactions, constraint errors | `docs/04-stack/drizzle-postgres.md` |
| Authorization and data exposure | `security.md` |
| Tests | `testing.md` |
| Gates and their order | `linting-and-formatting.md` |
| Next.js habits that do not apply | `docs/04-stack/tanstack-start.md` |
