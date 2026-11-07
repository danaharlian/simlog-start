# 0024 shadcn skill composition and UI rules

- Status: accepted
- Date: 2026-11-01
- Deciders: owner asked for the skill and the rules; the local patch, the skill selection, and keeping wrappers in `shared/ui` are the agent's and can be reversed by a new ADR

## Context

The owner asked to add the skills from `shadcn/ui` for building UI, to ban arbitrary values, to standardize on `cn`, and to forbid changing a generated primitive for one feature. `skills.md` says a third-party skill is read in full before it is installed.

The repo holds two skills. Reading `shadcn` found these conflicts with our rules:

- `SKILL.md` runs `npx shadcn@latest info --json` when it loads, through a `!` block. That is an unpinned download, and `npx` where we use pnpm.
- `allowed-tools` approves every `shadcn@latest` command with no prompt, `add` and `apply` included, and `apply` overwrites primitives.
- `customization.md` and `design-system.md` tell the agent to edit `cva` variants in primitives.
- It also recommends community registries, shows Radix samples next to Base UI ones, and has one cast. The full list is in `tailwind-shadcn.md`.

No hidden instruction, no network call beyond shadcn's own CLI and docs, and nothing else unexpected was found in its Markdown and helper files.

## Decision

- **Install `shadcn` only,** with `skills add shadcn/ui --skill shadcn --agent claude-code --copy`. `--copy` puts real files in `.claude/skills/`, which the installer ships to apps. `migrate-radix-to-base` is left out because we have no Radix code.
- **Patch `SKILL.md` in four places:** remove `allowed-tools`, replace the `!` block with an instruction to run `pnpm exec shadcn info --json`, change workflow step 1 to match, and replace the note on package runners with one pointing at our rules. Everything else stays as upstream. `skills-lock.json` records the source.
- **Compose, with priority:** `AGENTS.md` and `tailwind-shadcn.md`, then the skill, then memory. The skill answers which primitive and how; `add-ui-component` adds a missing one; `components.md` says where the file goes.
- **Primitives:** no change for one feature. Props and variants, or a wrapper in a separate file. A generic variant needs two real users and a human reviewer's approval in the PR. Listed lint fixes stay allowed.
- **Arbitrary values:** none in a class name we write. The `calc()` exception is removed, because a CSS variable in the CSS entry file covers that case. Generated primitives are not rewritten.
- **`cn`:** imported from `@/shared/lib/utils`, which re-exports the `cn` package.

## Consequences

- An agent building UI gets concrete composition rules, such as `Field`, `Empty`, and `data-icon`, that we do not have to write or maintain.
- **Risk: an update drops the patch.** `skills add` overwrites `SKILL.md`, which would bring the `!` block and `allowed-tools` back. Limited by the steps in `skills.md` and by reading the diff; no check enforces it.
- **Risk: the skill's own text still says `npx shadcn@latest` and shows Radix.** Limited by the note at the top of `SKILL.md`; an agent can still misread it.
- **Risk: no gate catches an arbitrary value or a changed primitive.** Closed by ADR 0025, `check:ui`.
- **Wrappers stay in `shared/ui/app-<name>.tsx`** when 2+ features use them, so that folder is not CLI-only. A separate folder would need a new lint boundary and changes to `components.md`, `folder-structure.md`, and `tanstack-form.md`.
- `check-docs` now prints 11 size warnings for the skill's files. They do not fail the check.

## Not verified

- **The skill was not exercised** on a real feature, and how often it triggers next to `add-ui-component` was not measured.
- **`pnpm exec shadcn docs` and `info` were not run inside an app.** Their presence was read from `shadcn@4.23.0 --help`.
- **That `DISABLE_TELEMETRY=1` stops the `skills` CLI's telemetry.** It was set for the install; the variable's effect was not checked.
- **The `cn` speed figures** (30×, 37×) are the upstream README's; we did not benchmark them.
- **`utils.ts` content** was read from the `start-app` template on shadcn's main branch, not from the version `versions.md` pins.

## Alternatives considered

- **Run the command as given, unpatched.** It keeps upstream updates simple, but leaves an unpinned command on load and no prompt before `apply`. Rejected.
- **Install both skills.** The second has no use here and would invite Radix code into the agent's context. Rejected.
- **Symlink from `.agents/skills`, the CLI's default.** The installer copies `.claude/skills`, and a link would not carry the files reliably. Rejected.
- **Move wrappers out of `shared/ui`.** This is closer to "outside `ui/`", but needs the changes named above for a small gain: a generated file and a wrapper are already told apart by name. Rejected for now.
- **Add a lint rule against arbitrary values now.** Not requested at the time. ADR 0025 adds a gate.

## Verification

Docs consulted (2026-11-01): `shadcn-ui/ui` `skills/` at 24a1642, `shadcn-ui/ui` `templates/start-app/src/lib/utils.ts` (main), `shadcn-ui/cn` README (main), `skills@1.7.4 add --help`, `shadcn@4.23.0 --help`, `shadcn@4.23.0 info --help`.

Run on 2026-11-01 on macOS, with the skill in place: `check-docs.mjs` 0 errors and 11 expected warnings; `test-check-docs.mjs` 75 of 75; `test-gates.mjs` 20 of 20; `bash scripts/test-real-app.sh` exit 0 with 7 of 7 gates on both installs and `preview` 200, so the skill's `.tsx`, `.mjs`, `.css`, and `.png` files do not break an app's gates.
