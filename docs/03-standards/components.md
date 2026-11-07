# Component Conventions

**When to read:** before creating, splitting, or reviewing a React component. Forms: `docs/04-stack/tanstack-form.md`. Tables: `docs/04-stack/tanstack-table.md`. Styling and primitives: `docs/04-stack/tailwind-shadcn.md`.

## Where a component goes

| Component | Location | Name |
|---|---|---|
| Used by one feature | `features/<f>/components/` | `invoice-list.tsx` |
| A part of a large form or page | `features/<f>/components/sections/` | `invoice-address-fields.tsx` |
| shadcn primitive (generated) | `shared/ui/` | as generated |
| Project wrapper around a primitive | `shared/ui/` | `app-<name>.tsx` |
| Generic composite used by 2+ features | `shared/ui/` | `stat-card.tsx` |
| Feature component another feature must render | Stays in the owner, exported from `index.ts` | |

Moving to `shared/ui` needs two real users and no business meaning. A component that knows what an invoice is stays in the feature; another feature renders it through the public API. Never import across feature internals, and never change a generated primitive for one feature: use its props and variants, or a wrapper (`tailwind-shadcn.md`, "Changing a primitive"). A wrapper used by one feature stays in that feature's `components/`. To choose and compose primitives, use the skill `shadcn`.

## Template

```tsx
// features/invoices/components/invoice-summary.tsx
import { cn } from '@/shared/lib/utils'

type InvoiceSummaryProps = {
  readonly number: string
  readonly total: string
  readonly isOverdue?: boolean
  readonly className?: string
}

export function InvoiceSummary({ number, total, isOverdue = false, className }: InvoiceSummaryProps) {
  return (
    <div className={cn('rounded-lg border p-4', isOverdue && 'border-destructive', className)}>
      <h2 className="text-sm text-muted-foreground">{number}</h2>
      <p className="text-2xl font-semibold">{total}</p>
    </div>
  )
}
```

## Rules

1. **Named export, destructured props, one main component per file** (`conventions.md`).
2. **Props are a `readonly` type** named `<Component>Props`. Pass the fields the component uses, not a whole DTO (`docs/02-architecture/design-principles.md`, ISP). Never a Drizzle row.
3. **Accept `className`** on anything a parent may place, merged last through `cn()`.
4. **A wrapper forwards the primitive's props.** Get them with `ComponentProps<typeof Button>` from React rather than assuming the primitive exports a props type.
5. **Prop names:** booleans `is`, `has`, `can`, `should`; callbacks `on` + event; slots by noun (`icon`, `actions`) or `render` + noun.
6. **Reuse primitives.** No hand-styled `<input type="checkbox">`, `<select>`, or `<button>` when one exists in `shared/ui`.
7. **Every data component handles loading, empty, and error**, and a `Result` with `ok: false` as well as a thrown error (`error-handling.md`). A paginated list also handles a page past the last one (`tanstack-table.md`, rule 8).
8. **No fetching in the wrong place.** The route loader and component share `queryOptions` (`tanstack-query.md`); state goes where `state-management.md` says.

## Rendering: there is no server/client split

Every component renders on the server during SSR, then hydrates and runs in the browser. There are no Server Components by default, and no `"use client"`. So:

- A render body must be safe on both sides and return the same output on both. `window`, `localStorage`, `Date.now()`, and random values do not belong in it.
- Browser APIs go in an event handler or `useEffect`. For UI that can only exist in the browser, use `<ClientOnly fallback={…}>`, and for a value known only after hydration, `useHydrated()`, both from `@tanstack/react-router` (Start execution-model guide; not run here).
- Server-only code never goes in a component. It sits behind a server function (`docs/04-stack/tanstack-start.md`).

## Dates and numbers in markup

The server renders first, so displayed text must not depend on the machine's time zone or locale. Observed on Node 24.22.1 (2026-11-06): the instant `2026-11-05T18:30:00Z` printed `11/6/2026, 1:30:00 AM` through `toLocaleString()` on a machine set to Asia/Jakarta, and `11/5/2026, 6:30:00 PM` with `TZ=UTC`: a different day. The browser then renders other text than the server sent, a hydration error React says to fix like any other bug (react.dev, `hydrateRoot`).

The app uses locale **`id-ID`** and time zone **`Asia/Jakarta`** (owner decision, ADR 0032). Instants are still stored in UTC (`typescript.md`, rule 13); only display uses the zone.

```ts
// shared/lib/format.ts
const LOCALE = 'id-ID'
const TIME_ZONE = 'Asia/Jakarta'

const dateFormat = new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, dateStyle: 'medium' })
const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, dateStyle: 'medium', timeStyle: 'short' })
const numberFormat = new Intl.NumberFormat(LOCALE)

export function formatDate(value: Date): string {
  return dateFormat.format(value)
}

export function formatDateTime(value: Date): string {
  return dateTimeFormat.format(value)
}

export function formatNumber(value: number): string {
  return numberFormat.format(value)
}
```

Type-checked (TypeScript 6.0.3 strict) and run with `TZ=UTC`: `formatDateTime(new Date('2026-11-05T18:30:00Z'))` gave `6 Nov 2026, 01.30`, and `formatNumber(1234567.5)` gave `1.234.567,5`.

- **Display dates and numbers only through these functions.** Not `toLocaleString()`, `toLocaleDateString()`, or a new `Intl` formatter in a component.
- **"Now" and relative time** ("5 menit lalu") differ between the server render and hydration by nature: compute them after hydration (`useHydrated()`, above). Do not hide the difference with `suppressHydrationWarning`.
- **Money is not formatted here yet.** What one stored minor unit of IDR is, is **Unknown** (open decision AG); `Intl` showed IDR with 0 fraction digits. The first feature that stores money decides it and adds `formatMoney`.
- **A component test compares against the formatter's output,** not a typed string: `Intl` output can hold a no-break space (U+00A0 observed between `Rp` and the amount). Only the formatter's own test spells the expected string.

## Roles

Each component has one role, so it has one reason to change.

| Role | Where | Owns | Never |
|---|---|---|---|
| Route | `src/routes/` | Search params, loader, where to go next | Business logic; markup beyond composing the feature (skill `add-route`) |
| Container | `features/<f>/components/` | One concern's data: one `useSuspenseQuery`, or one mutation hook from `hooks/`, or a form (the orchestrator below); passes results to children | Detailed markup |
| Presentational | `features/<f>/components/`, `components/sections/`, `shared/ui/` | Rendering its props; local UI state such as open or closed | Queries, mutations, navigation |

- **Callbacks go up** (`onSaved`, `onFilterChange`). The route decides where to navigate, so a feature component works on more than one page.
- **A component never computes a business rule** such as a status transition or a price. It renders what the server returns (`coding-standards.md`, "Business rules").

## Size and decomposition

Split by **responsibility first**; lines are only a safety alarm. Do not cut code into meaningless pieces to reach a number.

| Lines in a component file | Meaning |
|---|---|
| Up to 150 | Target |
| 150 to 200 | Look for a second responsibility |
| Over 200 | Split, unless it is generated or mostly data; say why in the PR otherwise |

**Must split** when a file holds several tabs or independent sections, unrelated state, or reactive logic mixed with markup. Review checks this table and these reasons. Lint stops the worst case only (ADR 0034): a function in a `.tsx` file over 200 lines of code, a file over 300, nesting over 3, and over 4 parameters (`docs/02-architecture/design-principles.md`, "Complexity limits"). A generated primitive is exempt; a component that is "mostly data" is not, so move the data to a constant in its own file.

Signals that show up before the line count does:

- More than one query, or more than one mutation, in one component.
- Comment banners dividing the file into parts.
- JSX nested more than four levels deep.

Dependencies point one way:

```
Orchestrator (form or page body): state, submit, layout
  ├── sections/    render one domain; no own copy of the state, no mutations
  ├── hooks/       reactive or derived logic
  └── pure helpers no React; lowest level
```

A section never imports its orchestrator. A pure helper imports no React, no hook, and no server function. Name a helper file for its concept (`invoice-form-values.ts`), not `utils.ts` or `helpers.ts`.

Stay in folders lint knows: `components/**` and `hooks/**` are covered, so `components/sections/` gets the UI layer rules. A new `utils/` folder gets **no** layer rules (checked: it may import a service without an error), so do not create one.

## Compound components

Use these only for multi-part UI that shares state and needs flexible arrangement. Simple components use props.

Follow the shape shadcn generates: **flat named exports**, not static properties (`StatCardTrend`, not `StatCard.Trend`). Give the context a `null` default and throw a helpful error when it is missing. Do not recreate a compound that a primitive already provides (`Tabs`, `Dialog`).

```tsx
// shared/ui/stat-card.tsx
import { createContext, use } from 'react'
import type { ReactNode } from 'react'

type Trend = 'up' | 'down' | 'neutral'

const StatCardContext = createContext<{ readonly trend: Trend } | null>(null)

const TREND_ICONS = { up: '↑', down: '↓', neutral: '→' } as const satisfies Record<Trend, string>

export function StatCard({ trend, children }: { readonly trend: Trend; readonly children: ReactNode }) {
  return <StatCardContext value={{ trend }}>{children}</StatCardContext>
}

export function StatCardTrend() {
  const context = use(StatCardContext)
  if (!context) throw new Error('StatCardTrend must be used within StatCard')
  return <span>{TREND_ICONS[context.trend]}</span>
}
```

## Accessibility

Minimum for every component, whatever level the PRD sets (ADR 0007, W):

- All interaction works by keyboard, with visible focus. Dialogs and menus are tested by keyboard.
- Use semantic elements first (`button`, `nav`, `main`); ARIA only where they are not enough. Never remove ARIA a primitive provides.
- Images have `alt`; inputs have labels (`tanstack-form.md`, rule 5).
- Color is never the only signal: the overdue state above needs text or an icon too.

## Testing

| Unit | Test |
|---|---|
| Pure helper | Plain unit test, no DOM |
| Hook | Hook test |
| Component | By role, label, and text, in `__tests__/` (a colocated test under `components/` cannot import a service: `linting-and-formatting.md`) |

The DOM test setup is not installed yet (`docs/04-stack/versions.md`, action item 4).

## Review checklist

- [ ] Right location; no business meaning in `shared/ui`.
- [ ] One role (route, container, presentational) and one responsibility; within the size guideline or a reason given.
- [ ] Narrow `readonly` props; `className` where a parent places it.
- [ ] Primitives reused; tokens respected (`tailwind-shadcn.md`).
- [ ] Loading, empty, error, and `ok: false` handled.
- [ ] Render is SSR-safe: no browser API or unstable value in the render body.
- [ ] Keyboard, focus, labels, and non-color signals work.
