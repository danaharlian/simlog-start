# 0025 `check:ui`: arbitrary values, palette colors, and changed primitives

- Status: accepted
- Date: 2026-11-01
- Deciders: owner asked for a check on arbitrary values, palette colors, and changed primitives; the design below is the agent's and can be reversed by a new ADR
- Extends: ADR 0024

## Context

ADR 0024 banned arbitrary values and changing a generated primitive for one feature, with only code review to catch either. Two facts shape a check:

- `shared/ui` holds generated primitives, which contain arbitrary values such as `rounded-[min(...)]`, next to our wrappers and composites, which may not. A path or a name alone cannot tell them apart.
- The scaffold already brings `button.tsx`, so the first install must start from what is there.

## Decision

Add one gate, `pnpm check:ui` (`docs/examples/check-ui.mjs`, copied to `scripts/`). It needs no ESLint config, so weakening that config does not turn it off. `check:gates` fails if the script is removed from `package.json`.

- **Arbitrary values.** It parses `src/` with the app's `typescript` and checks every string and template, token by token, against the last part of the class. `w-[350px]`, `bg-card/[0.5]`, and `[mask-type:luminance]` fail. `data-[state=open]:bg-card`, `[&>svg]:size-4`, and `w-(--x)` pass. Comments, visible text, tests, server code, and recorded primitives are not scanned.
- **Palette colors.** The same scan rejects Tailwind's default palette in a color utility, such as `text-gray-500`, `dark:bg-white`, and `border-t-red-500/50`. They ignore the theme and dark mode. `bg-card`, `bg-transparent`, `text-sm`, and a theme color with its own name pass. The names come from `theme.css` in tailwindcss 4.3.3; a palette a later version adds passes until the list is updated.
- **Primitives.** `shadcn-primitives.lock.json` holds a SHA-256 for each primitive. A different hash fails. Every other file in `shared/ui` must be `app-*` or recorded as our code with a reason, so a new primitive cannot stay unprotected by not being listed.
- **Recording.** `--accept` records a new primitive; a changed one also needs `--reason`, which stays in the lock. A primitive cannot be marked as our code.
- **First install.** The installer records every file in `shared/ui` except `app-*` as a primitive, once, and tells the human to review that.
- The lock is under CODEOWNERS.

## Consequences

- The two rules now fail in CI and in the installer's gates. `AGENTS.md` lists them as gated.
- Adding a primitive has one more step, in `add-ui-component`. A composite in `shared/ui` needs `--own`.
- **Risk: an agent runs `--accept --reason` to get past the check.** The script sees a hash, not whether the reason is true. Limited by the rule in `AGENTS.md`, a Claude Code hook (ADR 0026), the lock's diff in the PR, `code-review`, and CODEOWNERS, which works only once a human turns on "Require review from Code Owners".
- **Risk: `pnpm format` or a CLI upgrade changes a primitive's hash with no real change.** The check fails until someone records it with a reason. Accepted: a false alarm is cheaper than a missed edit.
- **Risk: a scaffold page or an app written before this gate uses palette colors.** It fails on the next `check:ui` and has to move to tokens. The current scaffold passes.
- **Risk: the baseline trusts what it finds.** A primitive already changed, or a composite, is recorded as a generated primitive. Limited by the installer's message.
- **Not caught:** classes built with `+`, a color from a template such as `` `bg-${color}-500` ``, and `@apply` in CSS. A string that is not a class but looks like one, such as `abc-[1]` or `to-white`, fails and cannot be suppressed: move it out of `src/` or reword it.

## Not verified

- **A real feature.** The gate ran on the scaffold, on test fixtures, and, since ADR 0026, on 11 primitives added with the CLI, not on a feature built from them.
- **False positives on real app strings** were tested only with the cases in `test-gates.mjs`.
- **CI.** `.github/workflows/ci.yml` has still never run on GitHub (ADR 0023). An app's own CI must add `check:ui`; this repo does not ship that workflow.

## Alternatives considered

- **`eslint-plugin-tailwindcss` or another lint plugin.** A new dependency, and support for Tailwind v4 and this exact ban was not checked. It would also need per-file exceptions in `shared/ui`. Rejected.
- **A `no-restricted-syntax` selector.** `eslint.code-rules.js` already records that a later block replaces the selectors in `eslint.no-suppress.js`. Rejected.
- **Compare primitives with the registry through `shadcn add --diff`.** Needs network in CI, breaks on a CLI upgrade, and cannot allow the listed lint fixes. Rejected.
- **Line-by-line regex with no parser.** Simpler, but it reads comments and visible text. Rejected.
- **No classification for files in `shared/ui`.** Less work for a composite, but a generated primitive with no arbitrary value could then be edited unnoticed. Rejected.

## Verification

Docs consulted: TypeScript's compiler API, which the script calls and the tests run; Tailwind v4 class forms from `tailwind-shadcn.md` (Context7, 2026-10-31); tailwindcss.com `colors.mdx` (Context7, 2026-11-01) and `theme.css` in tailwindcss 4.3.3 for the color names and utilities.

Run on 2026-11-01 on macOS: `test-gates.mjs` 69 of 69, 49 of them new, including what `check:ui` must reject and allow; `test-check-docs.mjs` 75 of 75; `check-docs.mjs` 0 errors and 11 expected warnings; `bash scripts/test-real-app.sh` exit 0 with 8 of 8 gates on both installs and `preview` 200. That script now also confirms, on the scaffold's `button.tsx`, that `check:ui` fails on a changed primitive, on an arbitrary value, and on a palette color, and passes after all three are undone.
