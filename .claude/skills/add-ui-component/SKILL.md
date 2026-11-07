---
name: add-ui-component
description: Add a shadcn/ui primitive to shared/ui with the installed shadcn CLI, review the generated code, and build a feature component from it. Use when a feature spec section 8 lists a missing primitive or when asked to add a button, dialog, table, input, or similar. Not for feature-specific components that only compose existing primitives.
---

# Add a UI component

Read `docs/04-stack/tailwind-shadcn.md` first. Run `verify-library-docs` for the shadcn CLI and for the Base UI component you add, against the **installed** versions (`pnpm exec shadcn --version`). Never paste a snippet from a tutorial or from memory: most online shadcn code is Radix-based, this project is Base UI. For the feature component built on it, follow `docs/03-standards/components.md`. Use the skill `shadcn` with this one for which primitive and how to compose it; its overrides are in `tailwind-shadcn.md`, "Skill composition". Use the MCP server `shadcn` only to find a component: its code and examples are Radix (`docs/05-agent-tooling/mcp.md`, "shadcn MCP protocol").

## Steps

1. **Need.** Take the primitive names from the feature spec (section 8) or the issue. Look in `src/shared/ui` (not memory) and add only what is missing. Not sure a component exists or what it is called: MCP `search_items_in_registries` with `registries: ["@shadcn"]`. MCP unavailable: `pnpm exec shadcn search @shadcn -q "<name>"`, and say so.
2. **Aliases.** Open `components.json`: `aliases.ui` and `aliases.components` must be `@/shared/ui`, `aliases.utils` `@/shared/lib/utils`, `aliases.lib` `@/shared/lib`, `aliases.hooks` `@/shared/hooks`. `install.sh` sets them. Different values: stop and tell the human; do not edit them by hand and do not generate files into `src/components`.
3. **Preview.** `pnpm exec shadcn add <name> --dry-run`, then `--diff` or `--view` for a file. For usage, `pnpm exec shadcn docs <name>`, then read its `base` URLs. An add command from the MCP server says `pnpm dlx shadcn@latest`: do not run it. The preview must list only files under `src/shared/` and, at most, a package already in `package.json`. A **new dependency** (it needs an ADR, `AGENTS.md`) or any `@radix-ui` import: stop and ask.
4. **Add.** `pnpm exec shadcn add <name>` without `--overwrite`. Never overwrite a primitive the team changed without reading the diff.
5. **Review the generated code** like a PR: imports use `@/shared/...`, `cn` comes from the utils file the scaffold exports (no `clsx`/`tailwind-merge`), no hard-coded colors, no `any` or casts, `shared` imports nothing from `features`. Run `pnpm format` (generated files can fail `pnpm check` until then), then `pnpm lint` and `pnpm typecheck`. `pnpm check:ui` reports the new files as not classified until step 6. A generated file that fails a gate: apply the fix listed in `tailwind-shadcn.md`, "Generated primitives that fail lint" (`field` and `sidebar` need one), and name it in the PR. With no listed fix: **stop and ask a human**. Do not suppress, cast, edit lint config, or ignore `shared/ui`.
6. **Record it, then commit it alone**, apart from the feature code. Apply any listed fix, run `pnpm format` again, since a fix can leave a file unformatted and formatting later changes its hash. Then `node scripts/check-ui.mjs --accept <name>.tsx` for each new file in `shared/ui`, including the ones the CLI added as dependencies, and `pnpm check:ui`. The commit holds the primitive and `shadcn-primitives.lock.json`: `feat(ui): add <name> primitive`.
7. **Compose, do not fork.** Use the primitive's props and variants, or wrap it in a separate file: the feature's `components/` for one feature, `shared/ui/app-<name>.tsx` for 2+. Never change a generated primitive for one feature, and never record such a change to pass `check:ui`: a hook blocks `--accept --reason`, `--forget`, and edits to the lock, so a person runs those. A generic variant needs the evaluation in `tailwind-shadcn.md`, "Changing a primitive": stop and ask. In what you write, no arbitrary values or palette colors, conditional classes through `cn()`, mobile-first. A file you add to `shared/ui` not named `app-*` needs `check-ui.mjs --own`.
8. **Check the result**: keyboard flow and focus styles, light and dark theme, small and large breakpoints, a label for every control. Write a component test only if the DOM test setup exists (`docs/04-stack/versions.md`, action item 4); otherwise say so.
9. **Docs.** A new project-level wrapper or convention goes into `docs/04-stack/tailwind-shadcn.md` in the same PR.

## Output

The primitives added (with the CLI version), the files created, gate results, anything a human must decide, and `Docs consulted:`.
