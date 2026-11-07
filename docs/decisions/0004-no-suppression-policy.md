# 0004 No suppression policy

- Status: accepted
- Date: 2026-10-24
- Deciders: repository owner (requested "perketat", i.e. tighten)

## Context

AI agents blocked by a type or lint error tend to take the cheapest exit: `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, `eslint-disable*`, `any`, `!`, `as unknown as T`, skipped tests, or a weaker config. The earlier docs allowed `@ts-expect-error` and `eslint-disable` "with a reason". A reason is text an agent can always write, so it does not constrain anything.

Measured on 2026-10-24 (ESLint 10.13, typescript-eslint 8.72, eslint-comments 4.8.1): the scaffold-style `recommended` config let through every `eslint-disable` form, `@ts-expect-error` with a description, `as unknown as`, `!`, object-literal assertions, a `JSON.parse` result used as `any`, and `@deprecated` calls. TanStack Router's generated `routeTree.gen.ts` ships with `/* eslint-disable */` and `// @ts-nocheck` by default, and its docs say to exclude it from linting and formatting.

## Decision

Zero inline suppression. Enforced mechanically, in layers (details in `docs/03-standards/no-suppression.md`):
1. ESLint config `eslint.no-suppress.js`: `noInlineConfig`, `eslint-comments/no-use`, `ban-ts-comment` (all three `@ts-*` banned), `no-explicit-any`, `no-unsafe-*`, `no-non-null-assertion`, `no-unsafe-type-assertion`, `consistent-type-assertions`, selectors for `as unknown as` and `<T>x`, `no-deprecated`.
2. `check-suppressions.mjs`: text backstop (also coverage ignores, `.only`/`.skip`).
3. `check-lint-integrity.mjs`: fails if a gate is weakened.
4. Optional Claude Code PostToolUse hook; CODEOWNERS for gate files; `code-review` treats any suppression or weakening as blocking.

Exceptions are human-reviewed config changes backed by an ADR, never comments. Generated files are excluded by config.

## Consequences

- More initial lint errors in scaffold code (for example narrowing casts). They are fixed, not suppressed.
- Tests that need invalid input use `unknown` parameters or `safeParse`.
- Rule names and options depend on the installed typescript-eslint and eslint-comments versions: re-verify after upgrades.
- Only protects the repo fully if branch protection requires code-owner review (human setting).
- Not yet run against the real app's own ESLint config.

## Alternatives considered

- Allow `@ts-expect-error` with description and issue link: rejected, text is trivially forged and it is the most common agent shortcut.
- Prose rules only (`AGENTS.md`): rejected, measured as insufficient in practice.
- Baseline/ratchet of existing suppressions: not needed for a greenfield repo (baseline is zero).

## Verification

Fixture project: 19 suppression forms flagged, clean file passes, generated file ignored. Integrity script: 7 deliberate weakenings caught. Text scan: temp git repo, diff and whole-tree modes. Hook script: mock stdin only. Sources: installed package source (typescript-eslint 8.72.0 `ban-ts-comment`, eslint-comments 4.8.1, ESLint 10.13 flat config schema), TanStack Router file-based-routing API page (`routeTreeFileHeader` default and "ignore the generated route tree from your linter"), Claude Code hooks documentation as reported 2026-10-24 (`.claude/settings.json`, matcher `Edit|Write`, exit code 2, stderr to Claude).
