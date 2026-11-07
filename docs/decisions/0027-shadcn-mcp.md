# 0027 shadcn MCP server: find with MCP, read and add with the CLI

- Status: accepted
- Date: 2026-11-01
- Deciders: owner asked for the server in both clients and in the skills; the pinned command and the limits on its tools are the agent's and can be reversed by a new ADR
- Extends: ADR 0024
- Amended by: ADR 0028 (`.vscode/mcp.json` removed; read "both files" below as `.mcp.json`)

## Context

The owner asked to integrate the shadcn MCP server for Claude Code and VS Code with `pnpm dlx shadcn@latest mcp init --client claude` and `--client vscode`, and to use it in the skills when building components. `mcp.md` listed it as a candidate that needs an ADR.

Run with shadcn 4.23.0 on 2026-11-01:

- **`mcp init` is not safe here as given.** In a folder with no lockfile it installed `shadcn` with npm and left `package-lock.json`. In a folder with no `package.json`, which is this repo, it also created one and `node_modules`. It writes `npx shadcn@latest mcp`.
- **The server has seven tools, and all of them only read.** None adds a file. The docs' "install" prompts work because the agent runs the command a tool returns.
- **Its answers ignore the project's base.** In a `base-nova` app, `view_items_in_registries` reported `radix-ui` as a dependency of `separator` and `dialog`, and returned no source. `get_item_examples_from_registries` returned `new-york-v4` code with `asChild`. For the same items, `shadcn add --view`, `shadcn view`, and `shadcn docs` returned Base UI.
- **Its add commands say `pnpm dlx shadcn@latest add`,** which is not the installed version.

## Decision

- **Write the two config files directly,** with the content `mcp init` writes for each client (`mcpServers` in `.mcp.json`, `servers` in `.vscode/mcp.json`) and one change: `pnpm dlx shadcn@4.23.0 mcp`. The version is pinned, as `mcp.md` asks, and the runner is pnpm, as `AGENTS.md` asks.
- **Ship both through the installer.** It merges into a file an app already has and keeps its servers. `mcp init` stays off the allowed list.
- **MCP finds; the CLI reads and adds.** `search_items_in_registries`, `list_items_in_registries`, and `get_project_registries` are for use. `view_items_in_registries` and `get_item_examples_from_registries` are not. An add command from the server is not run. The table is in `mcp.md`.
- **Skills:** `add-ui-component` step 1 searches with MCP, with the CLI as a fallback, and step 3 reads through the CLI. `tailwind-shadcn.md` and `skills.md` place it next to the `shadcn` skill.
- **`test-real-app.sh` starts the server from both files,** checks the exact list of tools, and runs one search.

## Consequences

- An agent can check the registry before assuming a component is missing, with no change to how files get added.
- **Risk: an agent reads Radix code from the server anyway.** The tools are still available, and it can mistake their output for this project's. Limited by the protocol in `mcp.md`, the note in `add-ui-component`, and `tailwind-shadcn.md`; `add-ui-component` stops on any `@radix-ui` import. No tool blocks the call.
- **Risk: the pin goes stale.** It must change with `versions.md` and `test-real-app.sh`. `test-gates.mjs` fails if the configs and that script disagree; nothing checks them against an app's installed version, which can be newer.
- **Risk: a new upstream tool that writes files.** `test-real-app.sh` fails when the list of tools changes.
- A person must approve the server in each client before it starts.
- `.mcp.json` and `.vscode/mcp.json` are now under CODEOWNERS and left out of Prettier: the installer's merge writes JSON that Prettier would reformat.

## Not verified

- **The server inside a real Claude Code or VS Code session.** It was driven over stdio with a test client using the documented protocol, from this repo and from a real app. Neither client has connected to it; this session's tools were not reloaded.
- **Whether a later shadcn version respects the base.** The limits on `view` and examples are worth re-checking at each version bump.
- **`pnpm` on the `PATH` of an editor started from a desktop launcher.** If it is missing, the server fails to start; `/mcp` shows it.
- **Linux and CI.** Runs were on macOS; the workflow has never run on GitHub (ADR 0023).

## Alternatives considered

- **Run the two commands as given in this repo.** Leaves `package.json`, `package-lock.json`, and `node_modules` in a repo that has none. Rejected.
- **Keep `npx shadcn@latest mcp`, the documented config.** The simplest, but unpinned, so a release changes what agents get with no review. Rejected.
- **`pnpm exec shadcn mcp`.** Follows an app's installed version, but fails in this repo, which has no `shadcn` dependency. Rejected.
- **`npx -y shadcn@4.23.0 mcp`,** as Context7 does. Also works; rejected because pnpm also passed, with clean stdout on an empty cache.
- **Use the server for code as well.** It is what the docs suggest, but it returned Radix code for a Base UI project. Rejected.

## Verification

Docs consulted (2026-11-01): https://ui.shadcn.com/docs/mcp; `shadcn@4.23.0 mcp init --help`; the server itself, over stdio: `initialize`, `tools/list`, and a call to each tool.

Run on 2026-11-01 on macOS: `test-gates.mjs` 90 of 90, 2 of them new; `test-check-docs.mjs` 75 of 75; `check-docs.mjs` 0 errors and 11 expected warnings; `bash scripts/test-real-app.sh` exit 0 with 8 of 8 gates on all three runs, and the server answering from both config files in a real app.
