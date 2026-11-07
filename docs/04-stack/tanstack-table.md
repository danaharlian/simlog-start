---
applies_to: "@tanstack/react-table ^9.3.1 (9.3.1 installed in the 2026-10-27 test app) and @tanstack/react-virtual ^3.14.22"
last_verified: 2026-10-31
verified_against: "installed react-table 9.3.1 and table-core 9.3.1 type declarations; the docs shipped inside the package (node_modules/@tanstack/react-table/skills: getting-started, table-state, migrate-v8-to-v9, references with-tanstack-query and with-tanstack-virtual); compile tests on TypeScript 6.0.3 (2026-10-27, 2026-10-31); shadcn data-table guide via Context7 (2026-10-31)"
---

# TanStack Table (and Virtual)

**When to read:** before building a data grid, list with sorting/filtering/pagination, or a long virtualized list.

**Version: v9** (ADR 0008, replaces decision Q of ADR 0007). v9 is a different major from v8: almost every v8 example, blog post, and model answer is wrong for it. Read the docs that ship in the installed package first: `node_modules/@tanstack/react-table/skills/*/SKILL.md` (they carry `library_version: 9.3.1`), then the type declarations in `node_modules/@tanstack/react-table/dist/` and `node_modules/@tanstack/table-core/dist/`. Reading those files needs no extra tool (TanStack Intent itself is not adopted, ADR 0007 N).

## Verified facts (v9.3.1)

- **Setup.** `useTable(options, selector?)` replaces v8's `useReactTable`. Options include `features`, `columns`, `data`. `features` comes from `tableFeatures({...})`. Each optional capability is a feature object you register (`rowPaginationFeature`, `rowSortingFeature`, `columnFilteringFeature`, `rowSelectionFeature`, `columnVisibilityFeature`, and others under `table-core/dist/features/`). An API that belongs to an unregistered feature does not exist on the table.
- **Row-model slots.** Client-side processing is a slot inside `tableFeatures`, after the feature it needs: `sortedRowModel: createSortedRowModel()`, `paginatedRowModel: createPaginatedRowModel()`. Server-side sorting or pagination needs no slot. (`rowModels` is not an option: the compiler rejects it.)
- **Column helper.** `createColumnHelper<typeof features, TData>()`, with two type parameters (v8 had one). `columnHelper.accessor`, `.display`, `.group`, and `.columns([...])` exist.
- **Row ids.** `getRowId: (row) => row.id`. The default is the row index.
- **Server-side modes.** `manualPagination`, `manualSorting`, `manualFiltering` stop the table from processing that stage; they do **not** fetch. With `manualPagination`, supply `rowCount` (or `pageCount`). The server must return rows already processed by every server-owned stage.
- **Controlled state.** Pass `state: { pagination }` **together with** `onPaginationChange` (a callback alone does not keep the table in sync), or pass a `@tanstack/react-store` atom through `atoms`. The v8 global `onStateChange` option is removed. `table.state` is the selected state; `table.atoms.<slice>.get()` and `table.store.state` are snapshots, not React subscriptions.
- **Rendering.** `table.FlexRender` (with `cell`, `header`, or `footer`) or the standalone `flexRender`; both are exported. `table.Subscribe` narrows re-renders. `@tanstack/react-store` is a dependency of v9 and is in the scaffold.
- **Virtual** is not a Table feature. It consumes the final row model in the renderer: `useVirtualizer({ count, getScrollElement, estimateSize, getItemKey, overscan })`, `getVirtualItems()`, `getTotalSize()`, `measureElement`.
- **Compile-tested shape** (TypeScript 6.0.3 strict, `@tanstack/react-table` 9.3.1):

```tsx
import {
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  flexRender,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'

type Invoice = { id: string; customer: string; amount: number }

const features = tableFeatures({
  rowPaginationFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
})
const columnHelper = createColumnHelper<typeof features, Invoice>()
const columns = columnHelper.columns([
  columnHelper.accessor('customer', { header: 'Customer' }),
  columnHelper.accessor('amount', { header: 'Amount' }),
])

export function InvoiceTable({ data }: { data: Array<Invoice> }) {
  const table = useTable({
    features,
    columns,
    data,
    getRowId: (row) => row.id,
    manualPagination: true,
    rowCount: 100,
    state: { pagination: { pageIndex: 0, pageSize: 20 } },
    onPaginationChange: () => undefined,
  })
  // render with table.getRowModel().rows, row.getAllCells(), flexRender(cell.column.columnDef.cell, cell.getContext())
}
```

  The `rowCount`, `state`, and `onPaginationChange` values above are placeholders to make it compile; real code takes them from the route search params and the query (see rule 4). Not run in a browser.

## Which table

| | Data table (`useTable`): **default** | Basic table (`shared/ui` `Table` primitive): exception |
|---|---|---|
| Use for | Entity lists, histories, logs, master data, tabular reports | Invoice lines in a dialog, a tax breakdown, key and value specs |
| Rows | Dynamic, can grow | Few and fixed, roughly under 10 |
| Sorting, filtering, pagination | Yes, through registered features | None |
| State | The table's, driven by search params (rule 4) | None |

If a table needs any interaction, it is a data table: never hand-write sorting or paging over raw `<table>` markup.

## Where it lives

| File | Holds |
|---|---|
| `features/<f>/components/<entity>-columns.tsx` | Columns; `features` when only one table uses them |
| `features/<f>/components/<entity>-table.tsx` | `useTable`, wiring from search params and the query |
| `features/<f>/components/<entity>-row-actions.tsx` | The actions menu of one row, rendered from a column's cell |
| `shared/ui/data-table.tsx`, and pagination or header parts | The generic shell. **Create it for the second table**, not the first (abstraction gate, `design-principles.md`) |

Generic shell, compile-tested and lint-clean with plain elements (ADR 0011). Use the `Table` primitives for the markup:

```tsx
import type { ReactTable, RowData, TableFeatures } from '@tanstack/react-table'

type DataTableProps<TFeatures extends TableFeatures, TData extends RowData> = {
  readonly table: ReactTable<TFeatures, TData>
  readonly emptyMessage: string
}

export function DataTable<TFeatures extends TableFeatures, TData extends RowData>({
  table,
  emptyMessage,
}: DataTableProps<TFeatures, TData>) {
  const rows = table.getRowModel().rows
  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((group) => (
          <tr key={group.id}>
            {group.headers.map((header) => (
              <th key={header.id}>{header.isPlaceholder ? null : <table.FlexRender header={header} />}</th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={table.getAllLeafColumns().length}>{emptyMessage}</td></tr>
        ) : (
          rows.map((row) => (
            <tr key={row.id}>
              {row.getAllCells().map((cell) => (
                <td key={cell.id}><table.FlexRender cell={cell} /></td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}
```

shadcn's data-table guide now targets v9 (`ui.shadcn.com/docs/components/base/data-table`), so it is a useful reference, but its sample is client-side and contains `as string`, `Payment[]`, and `"use client"`: all rejected here. Rule 4 still applies. Most other copies online are v8.

## v8 traps (agents trained on v8 will write these)

`useReactTable` (now `useTable`); `getCoreRowModel()`, `getSortedRowModel()`, `getPaginationRowModel()` passed as options (now slots in `tableFeatures`, and there is no core row model to pass); `createColumnHelper<Person>()` with one type argument; `onStateChange`; the `useLegacyTable` bridge from `@tanstack/react-table/legacy` (temporary migration aid, do not use in new code). The package ships a migration checklist: `skills/migrate-v8-to-v9/SKILL.md`.

## Rules

1. **Headless means we own the markup.** Render with shadcn/ui table primitives from `shared/ui`; never ship the library's demo styles.
2. **Column definitions** live next to the feature component (`components/<entity>-columns.tsx`), typed from the DTO. `features`, `columns`, and the data fallback are module-level constants or stable memos. A fresh `response.data ?? []` on every render invalidates the row models: use a module-level `emptyRows` constant.
3. **Register only the features you use**, and put each row-model slot after its feature. Prefer individual feature imports over `stockFeatures` (smaller bundle).
4. **Server-driven tables for real data.** Pagination, sorting, and filtering are server-side for any dataset that can exceed one page. Table state lives in **router search params** (validated), feeds a TanStack Query `queryOptions` key, and the server function receives allow-listed sort fields (`api-conventions.md`). Wire it with controlled `state` plus the matching `on…Change` callbacks and `manual*` flags. **Inferred:** binding Router search params to controlled state is our combination of two verified parts (controlled state here, search params in `tanstack-router.md`); the first table slice must prove it.
5. **Put every server-owned slice in the query key** (pagination, sorting, filters). Feed `query.data.rows` straight to `useTable`; never copy it into `useState`. Use `placeholderData: keepPreviousData` only when keeping the previous page visible is intended.
6. **Selection and row actions** use stable row ids (`getRowId`) from the DTO id, never the array index.
7. **Accessibility:** semantic `<table>` markup with proper headers, sortable headers as buttons with `aria-sort`, keyboard-reachable row actions. The row-actions column has header text for screen readers (`<span className="sr-only">Actions</span>`), never an empty `<th>`.
8. **Empty, loading, error states** are explicit parts of every table component. A query that returns a `Result` with `ok: false` is a successful call to Query: branch on `data.ok` before passing rows to the table (`docs/03-standards/error-handling.md`). A page number past the last page (an old link, or the last row of a page deleted) is not an empty list: say the page does not exist and link to the first page.
9. **Virtualization:** use TanStack Virtual only when row counts justify it (rule of thumb: more than about 1,000 rendered rows) and after measuring. Keep the virtualizer next to its render loop, give rows a `getItemKey` from the row id, and review accessibility (a virtualized table loses native table semantics unless handled).
10. No client-side processing of unbounded datasets.
11. Reusable app-level table conventions (`createTableHook`, `tableOptions`) are allowed only once a second table repeats them; read `skills/getting-started/references/create-table-hook.md` first.

## Verify before use

`createTableHook` and `tableOptions` signatures, the filtering and selection features (not exercised here), exact slot order for filtering plus sorting plus pagination, the Router search-param binding (rule 4), and the `@tanstack/react-virtual` version in use (`^3.14.22` in the scaffold; the Virtual API above comes from the reference shipped inside react-table 9.3.1, not from a separate Virtual docs read).
