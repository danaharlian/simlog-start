---
name: change-dependency
description: Add, upgrade, or remove an npm dependency, including an agent skill or MCP server that comes with a package - justify, ask a person, install pinned, run the gates, re-check the stack doc's verified facts, record it in versions.md and an ADR. Use when a task seems to need a package not in package.json, when asked to add, upgrade, bump, or remove a library, or when `pnpm outdated` or `pnpm audit` calls for an update.
---

# Change a dependency

Read `docs/04-stack/versions.md` ("Not in this stack", "Adding a dependency", "Rules") and `docs/decisions/README.md`. A person approves every dependency change: the agent proposes, and installs only after a yes (`AGENTS.md`: no new dependency without an ADR). Branch `chore/<slug>`, commit `chore(deps): <summary>` (`docs/03-standards/git-and-commits.md`).

## Which change needs what

| Change | ADR | Source |
|---|---|---|
| Add a package | Yes, always | `versions.md`, "Adding a dependency" |
| Upgrade inside the same major | No, unless it changes a decision an ADR records | `versions.md`, rule 4 |
| Upgrade a major, or move a pre-release (alpha, beta, RC) to another version | Yes, on a migration branch that reads the official migration guide | `versions.md`, rules 1 and 3 |
| Remove a package | A new ADR that supersedes the one that chose it; none if no ADR chose it | `docs/decisions/README.md` |

## Steps

1. **Justify before touching anything.** A package in "Not in this stack" gets the right-hand column instead; stop there. Adding: answer the five questions in "Adding a dependency", with **Unknown** where you cannot (bundle size has no tool yet, decision X). Upgrading: name the target version, read its changelog or migration guide in full, and search `src/` for every API it changes or deprecates. Take versions from the registry or `pnpm outdated`, never from memory.
2. **Ask.** Draft the ADR from `docs/templates/adr.md` with `Status: proposed`, or write the upgrade note for a same-major bump: purpose, alternatives, exact version, license, maintenance, install scripts, client impact, breaking changes that reach our code. Present it and stop. After the yes, record the person's words in `Deciders:` (ADR 0034 shows the form) and set `Status: accepted`.
3. **Install pinned,** with the range style the package's row in `versions.md` states: `pnpm add <pkg>@<version>`, `-D` for tooling. Packages that move together go in one command, as their rows say: Start with Router; `drizzle-orm` with `drizzle-kit`, on the same exact version; `typescript-eslint` on the version `@tanstack/eslint-config` resolves (rule 5). Never edit the lockfile by hand. `ERR_PNPM_IGNORED_BUILDS`: the build decision is a person's (rule 6); ask, do not allow it yourself.
4. **Skills and MCP servers that come with it.** pnpm 12 prints "Agent skills awaiting approval" for a package that ships skills. Do not run `pnpm approve <pkg>`: it links an unpatched second copy (`docs/05-agent-tooling/skills.md`, `drizzle` section). A package's skill or MCP server is adopted only as `skills.md` and `docs/05-agent-tooling/mcp.md` ("Adding a server") describe, with its ADR (ADR 0027 to 0030 show the pattern). Upgrading a package whose skill or server we already use (`shadcn`, `drizzle-kit`, `better-auth`): follow its "To update" and "Re-apply the local patch" lines in `skills.md`, move the version pin in `.mcp.json` and `mcp.md`, and do every extra step its `versions.md` row names (for Drizzle, `DRIZZLE_VERSION` in `scripts/test-real-app.sh`). No official skill or server: Context7 is the docs source (`mcp.md`, "Context7 protocol").
5. **Run the gates** and keep the real output: `typecheck`, `lint`, `test`, `build`, `check:suppressions`, `check:gates`, `check:ui`, `check`, `node scripts/check-docs.mjs`. A new `@deprecated` tag fails `lint` (`no-deprecated`), and a deprecation warning in `test` or `build` output fails the Definition of Done: switch to the replacement the library documents. A failure you cannot fix from the docs: stop and ask. Never suppress it, and never fall back to the old version without saying so.
6. **Re-check the stack doc** (`docs/04-stack/<lib>.md`) on an upgrade. Take each **Verified** claim and its "Verify before use" list against the new installed types and docs:

   | Result | Do |
   |---|---|
   | Still true | Keep it; move `last_verified` and name the new source in `verified_against` |
   | Changed | Rewrite it from the new source, and fix every doc and skill that repeats it (search for it) |
   | Cannot check now | Mark it **Unknown** and list it in the PR |

   Adding: write a stack doc only when the package carries rules of ours. Copy the front matter of an existing one (`applies_to`, `last_verified`, `verified_against`), list it in `docs/README.md`, and add a row to the table in `AGENTS.md` if agents need it often.
7. **Remove:** `pnpm remove <pkg>`, then search `src/`, `docs/`, `.claude/skills/`, and `.mcp.json` for its name. Delete or rewrite every rule that names it; a removed package leaves no stack doc and no row behind.
8. **Record** in the same PR (`docs/01-workflow/definition-of-done.md`, "Documentation"): the `versions.md` rows (declared version, npm latest, policy note) and its `last_verified`; the ADR and its line in `docs/decisions/README.md`; `.env.example` and the env modules for a new variable (`docs/03-standards/environment.md`); `mcp.md` and `skills.md` for a server or skill. The PR's "New dependencies" line names the package and links the ADR.

## Output

Package, version before and after, ADR link (or why none), gate results with real output or "not run: why", each verified fact re-checked (kept, changed, or **Unknown**), skills and MCP servers touched, and `Docs consulted:`.
