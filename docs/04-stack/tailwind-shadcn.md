---
applies_to: "tailwindcss (major pinned) + shadcn/ui"
last_verified: 2026-11-01
verified_against: "Web search of shadcn installation pages (mixed versions seen); Start docs list a 'Tailwind CSS Integration' guide; Tailwind v4 upgrade guide and adding-custom-styles via Context7 /tailwindlabs/tailwindcss.com, shadcn guides via /websites/ui_shadcn (2026-10-31; read, not built); shadcn-ui/ui skills/shadcn at 24a1642, shadcn-ui/ui templates/start-app/src/lib/utils.ts, and shadcn-ui/cn README, main branch (2026-11-01); Base UI v1.9.0 docs via Context7 /mui/base-ui/v1.9.0, Button, Menu, Tabs, Toast, and Select types and pages (2026-11-06; read, not built)"
---

# Tailwind CSS and shadcn/ui

**When to read:** before styling, adding a UI component, changing theme tokens, or running the shadcn CLI.

## Verified facts

- TanStack Start has an official **Tailwind CSS Integration** guide: follow it for the installed versions.
- shadcn/ui has **versioned and outdated install pages** (some show PostCSS setup and a `@canary` CLI for Start; others show the Vite plugin flow). Third-party tutorials and "skills" lag further behind. Treat every guide as suspect until it matches the installed Tailwind and shadcn versions.
- shadcn/ui copies component source into your repo; you own that code after `add`.
- `components.json` `aliases` has the keys `components`, `utils`, `ui`, `lib`, `hooks`. The CLI uses them to place files and rewrite imports, and they are still required when `tsconfig.json` `paths` resolve the same prefixes; the paths must include `src` (ours: `@/*` → `src/*`). Source: shadcn docs, `components-json` page (fetched through Context7 on 2026-10-31).
- The CLI lists `shadcn add [components...]` with `--dry-run`, `--diff`, `--view`, `--overwrite`, `--yes`, `--path` (4.22.2, checked with `--help`). **Run end to end with 4.23.0 on 2026-10-31 (ADR 0021):** `button`, `dialog`, `dropdown-menu`, `input`, `label`, `select`, `separator`, `sheet`, `skeleton`, `table`, `tabs`, and `tooltip` pass every gate as generated. `field` and `sidebar` fail lint, with the fixes under "Generated primitives that fail lint". Others were not tried.
- This project uses **Base UI** (`@base-ui/react` is installed by the scaffold). Do not add Radix primitives or paste Radix-based snippets from older tutorials.

## Rules

1. **Setup** only from the current official docs (Start's Tailwind guide + shadcn's TanStack Start installation page for the installed versions). Do not mix steps from different guides.
2. **Location:** shadcn primitives live in `shared/ui`. `install.sh` moves the scaffold's `src/components`, `src/lib`, and `src/hooks` into `src/shared/` and sets the `components.json` aliases (`components` and `ui` → `@/shared/ui`, `utils` → `@/shared/lib/utils`, `lib` → `@/shared/lib`, `hooks` → `@/shared/hooks`; option names checked in the shadcn docs, see below). Generated primitives are linted like any other file. If one fails a gate, apply the fix listed below; with no listed fix, stop and ask a human. Never suppress it, cast it, or ignore the file.
3. **Compose, do not fork: a generated primitive does not change for one feature.** See "Changing a primitive" below.
4. **Design tokens, no arbitrary values.** Colors, radii, spacing, type sizes, and z-index come from theme CSS variables / Tailwind theme tokens (`bg-card`, `text-muted-foreground`, `p-4`, `text-sm`). In code we write, no hard-coded colors, no magic numbers, no arbitrary values (`w-[350px]`, `bg-[#f8fafc]`, `text-[13px]`, `z-[999]`), and no palette colors (`text-gray-500`, `bg-white`): they ignore the theme and dark mode. A color the theme lacks, such as a success color, becomes a CSS variable registered under `@theme`, then `text-success`. There is no exception in a class name: a size no token can express, a `calc()` layout included, becomes a CSS variable in the CSS entry file and is referenced as `w-(--sidebar-width)` (v4 syntax; `w-[--x]` was v3) or added under `@theme`. Variant selectors such as `data-[state=open]:` are not values, and generated primitives are not rewritten to comply. `check:ui` enforces this (ADR 0025).

   ```tsx
   // Wrong: arbitrary values, magic numbers, hard-coded colors
   <div className="w-[350px] bg-[#f8fafc] p-[18px] text-[13px] rounded-[10px]">
     <span className="text-[#64748b]">Subtitle</span>
   </div>

   // Right: Tailwind scale and semantic theme tokens
   <div className="w-80 bg-card p-4 text-xs rounded-lg border">
     <span className="text-muted-foreground">Subtitle</span>
   </div>
   ```

4b. **No `@apply` in component files.** Use it only for truly global base styles in the CSS entry file.
5. **Class composition** via `cn()`. The scaffold installs the `cn` package from shadcn-ui instead of clsx + tailwind-merge, and its utils file is one line, `export { cn } from 'cn'` (`src/shared/lib/utils.ts` after `install.sh`). Import from `@/shared/lib/utils`, not from `cn` directly, and do not add clsx or tailwind-merge. Its README reports 30× on the common call shape and 37× across 58 repositories against those two; we did not measure this. Conditional classes use variants (e.g. `class-variance-authority`) when a component has 2+ visual variants.

   ```tsx
   <div
     className={cn(
       'rounded-lg border p-4', // base
       isActive && 'border-primary', // conditional
       className, // override from the parent, always last
     )}
   />
   ```

6. **No inline `style`** except for dynamic values that cannot be expressed as classes.
7. **Responsive and dark mode** are part of done: theme-aware tokens, both themes tested, and mobile-first classes: base, then `sm:`, `md:`, `lg:`, `xl:`.

   ```tsx
   <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{/* ... */}</div>
   ```

8. **Accessibility:** keep the primitive's ARIA/keyboard behavior; add labels, focus-visible styles, sufficient contrast; test keyboard flows for dialogs, menus, and forms. The target level (for example a WCAG level) and any automated accessibility tool are not decided repo-wide (decision W in `docs/decisions/README.md`); each PRD states its accessibility NFR, and QA checks it.
9. **Icons:** one icon library chosen via ADR; consistent size/stroke.
10. **Adding a component:** skill `add-ui-component`. It uses `pnpm exec shadcn add <name>` (flags `--dry-run`, `--diff`, `--view`, `--overwrite` checked with the installed CLI 4.22.2 `--help`), reviews the generated diff, and commits it separately. The feature's feature spec lists the primitives it needs (section 8): check which already exist in `shared/ui` and add only the missing ones.

## Changing a primitive

A generated primitive is every file the CLI wrote to `shared/ui`, such as `button.tsx`. A file named `app-<name>.tsx` or a composite such as `stat-card.tsx` is our code, not a primitive. Example: a form needs a submit button.

| Change | Verdict |
|---|---|
| Change the implementation of `button.tsx` for one feature's need | **Forbidden** |
| Use `Button` with the props and variants it already has | Allowed |
| Write `SubmitButton` as a separate file that wraps `Button`: `features/<f>/components/` for one feature, `shared/ui/app-submit-button.tsx` for 2+ | Allowed |
| Add a generic variant usable across features | Only after evaluation: two real users, proposed in the PR with why props or a wrapper do not work, approved by the human reviewer in the PR. Repeat it if `add --overwrite` regenerates the file |
| Apply a fix from "Generated primitives that fail lint" | Allowed, because it serves a gate and no feature. Name it in the PR |

A change to the look of the whole app goes in the theme's CSS variables, not in the primitives.

`check:ui` enforces this with `shadcn-primitives.lock.json` (ADR 0025), which classifies every file in `shared/ui`. The name is the file's path in that folder.

| Situation | Command (`node scripts/check-ui.mjs`) |
|---|---|
| The CLI added a primitive: after any listed lint fix and a final `pnpm format` | `--accept <file>` |
| A listed lint fix, an approved variant, or a reviewed `add --overwrite` changed a recorded one. **A person runs this** | `--accept <file> --reason "<why>"` |
| We wrote a file there other than `app-*`, which needs no entry | `--own <file> --reason "<why>"` |
| A file there was deleted. **A person runs this** | `--forget <file>` |

An agent never records a change just to pass the check: restore the file and wrap it. A Claude Code hook blocks those two commands and edits to the lock (ADR 0026), and an agent stops and asks instead. `--accept --reason` for a feature's need is the same violation as the edit, and the lock's diff shows it to the code owner.

## Skill composition

The installed skill `shadcn` (`.claude/skills/shadcn/`, ADR 0024) is used together with this document whenever an agent builds UI: it says **which primitive and how to compose it**, and this document says **what is allowed here**. Priority: `AGENTS.md` and this document, then the skill, then memory.

| Question | Read |
|---|---|
| Which primitive, and its structure (`Field`, `Card`, `Alert`, `Empty`, `Skeleton`, `render`, `data-icon`, `gap-*`) | Skill `shadcn`, `rules/` |
| Does a component exist, and what is it called? | MCP server `shadcn`, search only (`docs/05-agent-tooling/mcp.md`, "shadcn MCP protocol") |
| A primitive is missing | Skill `add-ui-component` |
| Where the file goes, props, size, states | `docs/03-standards/components.md` |
| Form state, table state | `tanstack-form.md`, `tanstack-table.md` |

The skill's rules apply, except where it says the following:

| The skill says | Here |
|---|---|
| `npx shadcn@latest`, `pnpm dlx shadcn@latest` | `pnpm exec shadcn`: the installed version, never `latest` |
| `@/components/ui/...`, `@/lib/utils`, `import { cn } from "cn"` | `@/shared/ui/...`, `@/shared/lib/utils` |
| The Radix side: `asChild`, `type="single"`, `sonner` | The Base UI side only: `render`, `multiple`, the `toast` component |
| `rules/base-vs-radix.md`: "Base requires an `items` prop" on `Select` | Optional in Base UI 1.9.0. Without it, `Select.Value` shows the raw value (`PAID`), not the label. Pass `items` whenever a value differs from its label, which in practice is always. Placeholder: `placeholder` on `Select.Value`, or a `null` item when the user must be able to clear the choice |
| Add a variant or restyle by editing `cva`, control heights, or focus rings (`customization.md`, `design-system.md`) | "Changing a primitive" above |
| Fix every issue in the added files | Only the fixes listed below; otherwise stop and ask |
| Check community registries; add from a URL or `owner/repo`; `add --all`, `--overwrite`, `apply`, `init --force` | Official items, named in the spec, one by one. Anything else needs a human's approval first, and a new dependency needs an ADR |
| `mcp.md`: `mcp init`, install through the MCP server, examples from it | The installer ships the config, and the MCP server finds components only: its code is Radix (`docs/05-agent-tooling/mcp.md`) |
| `design-system.md`: scaffold a new app, install everything, restyle | Not run in this app. Asked for one: stop and ask |
| A cast (`v as number[]`), `"use client"`, `useState` for data, `dangerouslySetInnerHTML` | `no-suppression.md`, `components.md`, `state-management.md`; the CSP is open (decision AC): stop and ask |

The skill's samples show arbitrary values only in code it marks wrong and in what the CLI generates; rule 4 holds for what we write.

## Generated primitives that fail lint

Seen with shadcn 4.23.0 and the `base-nova` style. After these edits, `lint`, `typecheck`, and `build` passed (ADR 0021), and `test-real-app.sh` repeats this on every run (ADR 0026). The sidebar was not rendered in a browser. Note the edit in the PR, record it with `check:ui --accept` after a final `pnpm format` (see "Changing a primitive"), and repeat it if `add --overwrite` regenerates the file. Run `pnpm format` after `add`: `check` failed on 6 of the 14 generated files until then.

| File | Rule | Fix |
|---|---|---|
| `field.tsx` | `no-unnecessary-condition` | `uniqueErrors?.length` becomes `uniqueErrors.length` |
| `sidebar.tsx` | `no-shadow` | Rename the `open` parameter in `toggleSidebar`: `(current) => !current` |
| `sidebar.tsx` | `consistent-type-assertions`, `no-unsafe-type-assertion` | Remove the three `as React.CSSProperties`, and add the file below once |

```ts
// shared/ui/css-custom-properties.d.ts: lets `style` accept CSS variables with no cast
import 'react'

declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined
  }
}
```

## Pitfalls

- Using Tailwind v3 config patterns (`tailwind.config.js`, `@apply` heavy CSS) with Tailwind v4, or the reverse.
- Following a shadcn tutorial that installs deprecated packages.
- Pasting samples from shadcn's guides unchanged: seen on the current pages (2026-10-31): `as string`, `Payment[]`, `min-h-[120px]`, `"use client"`, and Radix or Aria variants of a page. They fail our lint or rules. The URL names the variant: read `ui.shadcn.com/docs/components/base/<name>`.
- Editing many generated primitives ad hoc, making upgrades painful.
- Swapping a button for another element with `render` and leaving `nativeButton` on. Base UI parts that render a `<button>` (`Button`, `Menu.Trigger`, `Tabs.Tab`, `Toast.Action`, and others) default to `nativeButton: true`; with `render={<a />}`, `render={<Link />}`, or a `<div>`, set `nativeButton={false}` (**Verified**, Base UI 1.9.0 docs). That our `shared/ui` wrappers pass the prop through to Base UI is **Inferred** from generated code that spreads props; check the file before relying on it.

## Verify before use

Tailwind major and its Vite/PostCSS integration, CSS entry file conventions, shadcn CLI commands and `components.json` schema, primitive library choice, animation utility packages.
