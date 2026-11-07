# 0003 Tooling baseline from the scaffold

- Status: accepted (`simple-import-sort` replaced by `import/order`: ADR 0011)
- Date: 2026-10-18

## Context

The app was scaffolded with `pnpm dlx shadcn@latest init -t start`. The generated `package.json` already contains a toolchain. Choosing something different would add migration work for no clear gain, so the docs adopt what is installed, and record the gaps found in the audit.

## Decision

Adopt:
- pnpm as package manager.
- ESLint 10 (flat config) with typescript-eslint, `@tanstack/eslint-config`, `eslint-plugin-boundaries` for feature boundaries, ~~`simple-import-sort`~~, `eslint-plugin-eslint-comments`, and Prettier (with the Tailwind plugin). `lint` runs with `--max-warnings 0`.
- Vitest as the test runner (version to be fixed: see `versions.md` action item 4).
- Better Auth for authentication and sessions.
- Base UI as the shadcn primitive base, Tailwind v4 via `@tailwindcss/vite`.
- pino for structured logging; `pg` as the Postgres driver.
- Drizzle ORM as the ORM (owner decision). The scaffold's Prisma packages are removed.

## Consequences

- Fewer tools than a separate boundary checker (dependency-cruiser) would add.
- The TanStack Query and Router ESLint plugins must be added (not installed).
- Vitest 3.0.7 likely does not match Vite 8: upgrade or verify before relying on tests.
- `latest` tags in `package.json` must be replaced with ranges.

## Alternatives considered

- Biome or Oxlint/Oxfmt: single binary, but the TanStack ESLint plugins would not apply and the scaffold already ships ESLint.
- dependency-cruiser for boundaries: more setup, same outcome as the installed plugin.
- Keeping Prisma: rejected by the owner, who wants Drizzle.

## Verification

Sources: scaffold `package.json`; npm registry metadata queried 2026-10-18 (vitest, vite, @tanstack/*, better-auth, @types/pino).
