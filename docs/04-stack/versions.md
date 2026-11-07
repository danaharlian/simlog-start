---
applies_to: "all"
last_verified: 2026-10-27
verified_against: "the owner's package.json from `pnpm dlx shadcn@latest init -t start` (attached 2026-10-27), npm registry metadata queried 2026-10-27, and an install + gates run on a TanStack CLI scaffold with that package.json plus the owner's eslint.config.js, tsconfig.json, vite.config.ts, components.json, and .prettierrc (2026-10-29)"
---

# Versions Registry

**When to read:** when adding or upgrading a dependency, or when unsure which major of a library is in use. The procedure for adding, upgrading, or removing one is skill `change-dependency`; this page holds the facts and rules it applies.

**The installed version in `package.json` + `pnpm-lock.yaml` is the truth.** This file records what the app's `package.json` declares, what npm reports as latest, and what we pin on purpose. Update it in the same PR as any dependency change. "npm latest" is as of 2026-10-27. Decisions that fix a version are in ADR 0007 and ADR 0008.

`bash install.sh` (see `docs/README.md`) applies the items marked **installer** below; the rest are reminders.

**Scaffolding with no prompts** (shadcn 4.23.0, run 2026-10-31): `pnpm dlx shadcn@latest init -t start` stops at a preset prompt. With no terminal, use `pnpm dlx shadcn@latest init -t start -b base -p nova -n <name> --no-monorepo -y`. `-p` takes `nova`, `vega`, `maia`, `lyra`, `mira`, `luma`, `sera`, or `rhea`. `base-nova`, which `--help` names under `--defaults` and `components.json` stores as `style`, is rejected by `-p`.

## Declared in the app's package.json

| Package | package.json | npm latest | Policy / note |
|---|---|---|---|
| `@tanstack/react-start` | `latest` | 1.169.4 | **installer** replaces `latest` with a caret range. 1.0 stable; needs Vite 8 |
| `@tanstack/react-router` | `latest` | 1.170.46 | Same. Move together with Start |
| `@tanstack/react-router-devtools`, `@tanstack/react-devtools`, `@tanstack/devtools-vite` | `latest` | 1.167.2 / 0.10.13 / 0.8.5 | **installer** replaces `latest`; dev-only |
| `@tanstack/router-cli` | ^1.167.45 | 1.167.46 | Provides `tsr generate` (script `generate-routes`) |
| `@tanstack/react-query` | ^5.104.5 | 5.105.0 | v5 line. `ensureQueryData`/`fetchQuery`/`prefetchQuery` are deprecated: see `tanstack-query.md` |
| `@tanstack/react-form` | ^1.33.5 | 1.33.5 | |
| `@tanstack/react-table` | ^9.3.1 | 9.3.1 | **v9** (ADR 0008): a different major from v8. Read `tanstack-table.md` |
| `@tanstack/react-store` | ^0.11.2 | 0.11.2 | Dependency of Table v9 (atoms and `useSelector`). Declared directly in the app |
| `@tanstack/react-virtual` | ^3.14.22 | 3.14.23 | For long lists; rules in `tanstack-table.md` |
| `@tanstack/charts` | ^1.1.0 | 1.1.0 | In the template. **No stack doc and not verified**: read the installed types before use |
| `@tanstack/eslint-config` | `latest` | 0.4.0 | **installer** replaces `latest`. Sets `parserOptions.project: true` (matters for `eslint.no-suppress.js`) |
| `zod` | ^4.6.7 | 4.6.7 | v4 line |
| `better-auth` | ^1.7.13 | 1.7.14 | Security-critical; upgrade via branch. Email and password only (ADR 0007, R). See `better-auth.md`. On a bump, check the docs version in `mcp.md` and re-read the Better Auth skills (`skills.md`) |
| `drizzle-orm` / `drizzle-kit` | `1.0.0-rc.5` (exact) | 0.45.4 `latest`, 1.0.0-rc.5 `rc` | **Release candidate** (ADR 0008). Keep both on the same exact version. See `drizzle-postgres.md`. The MCP server runs this install; on a bump, refresh skill `drizzle` (`docs/05-agent-tooling/skills.md`) and change `DRIZZLE_VERSION` in `test-real-app.sh` |
| `pg` / `@types/pg` | ^8.23.1 / ^8.23.1 | 8.23.1 | node-postgres driver. Pool options: `drizzle-postgres.md` |
| `pino` | ^10.4.0 | 10.4.0 | Logging. v10 line (the old scaffold had 9.4.0). pino ships its own types: no `@types/pino` |
| `vite` | ^8 | 8.3.5 | Required by Start |
| `@vitejs/plugin-react` | ^6 | 6.1.2 | Must come after `tanstackStart()` in `vite.config.ts` |
| `typescript` | ^6.0.2 | 7.0.2 | **Decided: stay on `~6.0.x`** (ADR 0007, P): typescript-eslint 8.72 needs TypeScript `<6.1`. **installer** changes `^` to `~` |
| `eslint` | ^10 | 10.13.0 | Flat config |
| `prettier` / `prettier-plugin-tailwindcss` | ^3.9.10 / ^0.8.1 | 3.9.10 / 0.8.1 | |
| `tailwindcss` / `@tailwindcss/vite` | ^4 / ^4 | n/a | Tailwind v4 with the Vite plugin |
| `shadcn` | ^4.22.1 | 4.23.0 | CLI package. The MCP server pins this version (`docs/05-agent-tooling/mcp.md`) |
| `@base-ui/react` | ^1.9.0 | 1.9.0 | Primitive base is **Base UI**, not Radix |
| `cn` | ^0.5.0 | 0.5.0 | shadcn-ui/cn: npm describes a drop-in for clsx + tailwind-merge |
| `class-variance-authority`, `lucide-react`, `tw-animate-css`, `@fontsource-variable/inter` | ^0.7.1, ^1.61.0, ^1.4.0, ^5.3.0 | 0.7.1, 1.62.0, 1.4.0, n/a | UI helpers and font |
| `react` / `react-dom` | ^19.3.1 | 19.3.1 | |
| `@types/node` | ^22 | 26.6.5 | `^22` is compatible with Vitest 5 (needs `^22 || >=24`) |

## Added by `install.sh` (exact pins; tested together on 2026-10-27)

| Package | Pinned | npm latest | Why |
|---|---|---|---|
| `typescript-eslint` | 8.72.0, then **moved to the version `@tanstack/eslint-config` uses** (8.72.1 on 2026-10-29) | 8.72.1 | Needed directly by `eslint.no-suppress.js`; peer TypeScript `>=4.8.4 <6.1.0`. ESLint fails with `Cannot redefine plugin "@typescript-eslint"` if the app and `@tanstack/eslint-config` hold two copies; the installer aligns them (see Rules) |
| `@eslint-community/eslint-plugin-eslint-comments` | 4.8.1 | n/a | Makes every `eslint-*` directive comment an error |
| `eslint-plugin-boundaries` | 7.2.0 | 7.4.0 | Feature boundaries. `docs/examples/eslint.boundaries.js` was tested on 7.2.0 only: re-run the checks before moving up |
| `eslint-import-resolver-typescript` | 4.4.5 | n/a | Resolves the `@/*` alias for the boundary rules |
| `vitest` | 5.0.5 | 5.0.5 | Test runner (ADR 0007, O). A trivial test ran under the app's Vite 8 config; component and DOM tests are not set up |

Not added: `@tanstack/eslint-plugin-query` (5.105.0) and `@tanstack/eslint-plugin-router` (1.162.0): wiring their rules needs the rule names verified first (action item 3 below).

## Action items (what `install.sh` does not do)

1. **Create `.env.example`** and the Zod env module before adding auth or the database client.
2. **Check the shadcn move.** `install.sh` sets the `components.json` aliases and moves `src/components`, `src/lib`, and `src/hooks` into `src/shared/` (`ui`, `lib`, `hooks`), rewriting imports. Look at the diff once. A file it could not move (destination exists) or a CSS or config path that still names an old folder is listed in its output. `src/shared/lib/utils.ts` must exist before `shadcn add`: generated components import `cn` from it.
3. **Add the TanStack ESLint plugins** `@tanstack/eslint-plugin-query` and `@tanstack/eslint-plugin-router`, after confirming rule names in their docs. `@tanstack/eslint-config` does not list them as dependencies (verified from npm).
4. **Add test libraries** when the first UI test is written (no Testing Library, DOM environment, or Playwright yet). Choose versions via `verify-library-docs`. Vitest with the TanStack Start Vite plugin was only checked with a plain unit test. A separate fixture without Start ran form tests under Vitest 5.0.5 with jsdom 30.1.3 and `@testing-library/react` 16.3.3 (ADR 0011); that shows they work together, not that they are chosen.
5. **Set explicit `pg` pool options** in `shared/db/client.ts` (`drizzle-postgres.md`, rule 4).
6. **Add Drizzle scripts**: `db:generate` → `drizzle-kit generate`, `db:migrate` → `drizzle-kit migrate`, `db:migrate:test` → `DB_TARGET=test drizzle-kit migrate`, and `drizzle.config.ts` (its full text, which loads `.env` and picks the database, is in `environment.md`; the `schema` glob is in `drizzle-postgres.md`). The owner's `package.json` has no `db:*` scripts yet. Both commands ran on a real PostgreSQL 18.4 in a fixture (ADR 0014); run them again against your own server version.
7. **Commit `src/routeTree.gen.ts`** (decision L). It is not in the template's `.gitignore`; keep it that way. The installer ignores it for lint through `eslint.ai-docs.js` and for format through `.prettierignore`. The first `build` rewrites the scaffold's copy in the generator's own style: commit that once.
8. **Turn on "Require review from Code Owners"** in the repository's branch protection (a GitHub setting no script can set) and put the real owner in `.github/CODEOWNERS` (`install.sh --owner @org/team`).

## Not in this stack

If a need below comes up, use the right column. Anything else not listed in this file still needs an ADR.

| Do not add | Why | Use |
|---|---|---|
| `axios` | Server functions cover our own UI | Server functions; native `fetch` for external APIs |
| `moment`, `dayjs`, `date-fns` | No date library is chosen | `Date` and `Intl`; a library needs an ADR |
| `lodash` | Mostly native now | Native methods; a small helper in `shared/lib` |
| `styled-components`, `emotion` | Conflicts with the styling approach | Tailwind (`tailwind-shadcn.md`) |
| `redux`, `mobx`, `jotai`, `zustand` | No store library (ADR 0010) | Query, search params, Form, then `useState` (`state-management.md`) |
| `nuqs` | Router already validates search params | `validateSearch` (`tanstack-router.md`) |
| `react-hook-form`, `@hookform/resolvers` | Another form library | TanStack Form (`tanstack-form.md`) |
| `prisma`, `mongoose` | Another ORM | Drizzle (`drizzle-postgres.md`) |
| `express`, `next` | Another server or framework | Server routes (`tanstack-start.md`) |
| Radix primitives | The primitive base is Base UI | `@base-ui/react`, through the shadcn CLI |
| `pino-pretty`, `msw`, `sonner` | Useful, not chosen | Propose with an ADR when the need is real |

## Adding a dependency

Answer these in the ADR (`docs/templates/adr.md`), then add it with `pnpm add`, in `dependencies` for runtime and `devDependencies` for tooling:

1. Can an installed library or a native API solve it?
2. Is it maintained: recent releases, real usage, an acceptable license?
3. Does it run install scripts (rule 6)?
4. What does it add to the client bundle, if it reaches the client? **Unknown** is an allowed answer until decision X has a tool.
5. Does it work in Start's SSR and client builds? Try it, do not assume.

CI installs with `pnpm install --frozen-lockfile` (pnpm's default in CI when a lockfile exists) and runs `pnpm audit`. Check for updates periodically with `pnpm outdated`. Every upgrade follows the rules below.

## Rules

1. Do not upgrade a pinned major without an ADR and a migration branch that reads the library's official migration guide.
2. Context7 and search results may describe a different major than the installed one (react-table v8 vs v9, Drizzle 0.x vs 1.0, Better Auth 1.6 vs 1.7). Match the version before trusting an example. The installed package's own types, and docs shipped inside it (react-table ships `skills/`), outrank any web page.
3. Alpha/beta/RC packages require an ADR before use in production code (Drizzle 1.0 RC: ADR 0008).
4. After any dependency change, update this table and run `pnpm typecheck && pnpm lint && pnpm test`.
5. **Keep one copy of `typescript-eslint`.** The app's version must be the one `@tanstack/eslint-config` resolves, otherwise `pnpm lint` stops with `Cannot redefine plugin "@typescript-eslint"` (found on a real install, pnpm 12.3.4, 2026-10-29). After upgrading `@tanstack/eslint-config`, `typescript-eslint`, or the lockfile, run the installer again: it compares the two and re-pins. Manual fix: `pnpm add -D -E typescript-eslint@<version @tanstack/eslint-config uses>`.
6. **pnpm 11 and newer need a build decision** for every dependency with an install script, in `pnpm-workspace.yaml` under `allowBuilds`, or `pnpm install` fails with `ERR_PNPM_IGNORED_BUILDS`. The installer sets `unrs-resolver: false` (from `eslint-import-resolver-typescript`; its script only checks a prebuilt binary; **Inferred** safe on macOS and Windows, checked on Linux only). Other packages: `pnpm approve-builds`.
