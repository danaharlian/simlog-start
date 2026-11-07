# Code Conventions

**When to read:** when naming a symbol, arranging imports, writing a comment, or wondering whether a style choice is already decided. File and folder names are in `docs/02-architecture/folder-structure.md`; TypeScript rules are in `typescript.md`.

Prefer what lint decides over what memory suggests. Each row below says who checks it.

## Naming symbols

| Thing | Convention | Example | Checked by |
|---|---|---|---|
| Variables, functions | `camelCase` | `totalAmount`, `calculateDiscount` | Review |
| Fixed module-level literal data | `UPPER_SNAKE_CASE` | `VALID_TRANSITIONS`, `INVOICE_ERROR` | Review |
| Other module-level values (schemas, query options, columns, computed maps) | `camelCase` | `createInvoiceSchema`, `invoiceColumns` | Review |
| React components, types | `PascalCase` | `InvoiceList`, `InvoiceRow` | Review |
| Generic type parameters | `T` or `T` + PascalCase | `TData`, `TFeatures` | **Lint** (`naming-convention`) |
| Hooks | `use` + PascalCase | `useCreateInvoice` | Review |
| Booleans | `is`, `has`, `can`, `should` prefix | `isLoading`, `canPay` | Review |
| Handlers inside a component | `handle` + event | `handleSubmit` | Review |
| Callback props | `on` + event | `onSubmit`, `onPaginationChange` | Review |
| Type guards | `is` + PascalCase | `isAppError` | Review |
| Factories | `create` or `define` + noun; `appError.*` for errors | `defineEvent`, `appError.notFound` | Review |
| Zod schema and its type | `<thing>Schema`, `<Thing>` | `createInvoiceSchema`, `CreateInvoice` | Review |
| Event names | `<feature>.<past-tense-fact>` | `orders.paid` | Review |

Name by the business concept, not by the type: `overdueInvoices`, not `invoiceArray`. Abbreviate only what the business abbreviates.

## Syntax lint decides

These were each confirmed to fail `pnpm lint` on a fixture using the installed configs (ADR 0011). Older examples, including most of the web, get them wrong.

| Write | Not | Rule |
|---|---|---|
| `Array<string>`, `ReadonlyArray<string>` | `string[]`, `readonly string[]` | `@typescript-eslint/array-type` |
| `import type { X } from './x'` as its own line | `import { y, type X } from './x'` | `import/consistent-type-specifier-style` |
| A top-level `import type` | `const a: import('./x').X` | `@typescript-eslint/consistent-type-imports` |
| `{ run: () => void }` | `{ run(): void }` | `@typescript-eslint/method-signature-style` |
| `render: function Render({ form }) {…}` in `withFieldGroup` | A function name equal to the constant it is assigned to | `no-shadow` |

## Imports

1. **Do not arrange imports by hand.** `@tanstack/eslint-config` enforces the order through `import/order` and `sort-imports`, and `eslint --fix` applies it. Do not copy an order from another project or from an agent's habit.
2. **Use `@/…` to leave a feature**, a relative path within one. No `../../../` chains beyond one level.
3. **Another feature:** only `@/features/<name>`, or `@/features/<name>/index.server` from server code. The two entry points are the only barrels allowed in a feature; do not add other `index.ts` files inside `components/` or `server/`.
4. **`shared`:** import the specific file (`@/shared/ui/button`), except modules documented as having an index (`@/shared/errors`).

The boundary rules behind 2 and 3: `linting-and-formatting.md`.

## Exports

- **Named exports only.** A default export is for what the framework requires. Lint rejects one under `src/features/` and `src/shared/` (`eslint.code-rules.js`, ADR 0021); `src/server.ts` is outside that scope because it needs one.
- **One main component or concept per file.** A small private helper may stay beside it.
- **Export what a consumer needs today**, not "just in case".

## Comments

Code says what; a comment says **why**. Write one only for a constraint, a trade-off, or a surprise the code cannot show.

```ts
// Wrong: repeats the code
// Subtract one from page
const pageIndex = page - 1

// Right: gives the reason
// The billing API is 1-based; the table state is 0-based.
const pageIndex = page - 1
```

- **Doc comments** on an exported function only when its name and types leave a real question (a unit, a limit, an edge case). A feature's public API is the first place to look for one.
- **Name the race** at the code that prevents it, with the mechanism, so nobody removes a `WHERE version` or a `.for('update')` as noise: `// Race: two saves of one form → optimistic lock on version (spec section 4).` One comment per collision point in the feature spec (`docs/04-stack/drizzle-concurrency.md`).
- **Code that looks wrong but was checked** says what was checked and where: `// return, not a bare call: TypeScript narrows only after a return (drizzle-postgres.md, "Transactions").`
- **Link a rule, do not restate it.** Name the document and section; a copy drifts from its source (`writing.md`, rule 9).
- **`TODO(verify): <what>`** for an unverified API (rule zero), listed in the PR.
- **Follow-up work is a `TODO` that points to tracked work:** `TODO(<slug>/T<n>): <what remains>, needed when <condition>`, where `T<n>` is a task in `specs/<slug>/07-tasks.md`; for tier S, the issue's id in place of `<slug>/T<n>`. Example: `// TODO(invoice-export/T4): add a name filter, needed when customers exceed one page in production`. No task or issue, no `TODO`: create one, or write a why-comment instead.
- **Never** leave commented-out code. Git has it. **Never** explain a suppression: there are none (`no-suppression.md`).

## Formatting

Prettier decides, with the app's `.prettierrc`; do not restate its options here or argue them in review. `pnpm format` writes, `pnpm check` verifies. Tailwind classes are sorted by `prettier-plugin-tailwindcss`.
