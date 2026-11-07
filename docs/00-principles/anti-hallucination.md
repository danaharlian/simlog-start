# Anti-Hallucination Protocol

**When to read:** before writing code that calls any library, framework, or CLI; and whenever you feel "pretty sure" about an API.

## Why this exists

The TanStack ecosystem moves fast. Concrete example verified on 2026-10-15: during the Start beta/RC period, server function validation was renamed `.validator()` → `.inputValidator()`. In 1.0 stable (declared 2026-10-13) `.inputValidator()` was removed and `.validator()` is the current API. An agent trusting memory of the RC writes code that no longer compiles. Plausible but wrong is the failure mode to design against.

A second case, verified 2026-10-18, fails silently: in TanStack Query 5.104.x `ensureQueryData`, `fetchQuery`, and `prefetchQuery` (and the infinite variants) still compile but are marked `@deprecated` in favor of `queryClient.query()`. Even the official Router docs used `ensureQueryData` until recently, so older examples and this repo's own earlier drafts were affected. Defense: read the installed `.d.ts` for `@deprecated`, and lint on deprecation.

## The protocol

**Before writing**
1. Read the installed version from `package.json` / lockfile for every library you will touch.
2. Read our rule file `docs/04-stack/<library>.md`. A skill gives the procedure; it is not a source for an API (third-party skills are source 5 below).
3. Check which documentation tools respond (Context7, the vendor's MCP server) and note each as used, unavailable, or failed. When one fails, take the fallback in `docs/05-agent-tooling/mcp.md`, "When a tool is unavailable or lacks an answer".
4. Fetch official docs for that version via MCP (`docs/05-agent-tooling/mcp.md`), one concept per query. Use the `verify-library-docs` skill.
5. If the API was renamed, removed, or deprecated across versions, read the migration guide or changelog that covers the installed version.
6. If the API is type-heavy, confirm against the installed package's type definitions in `node_modules`.

**While writing**
7. Use only symbols, options, and import paths you have seen in a source from the hierarchy below in this session.
8. If you cannot verify something, do not write a guess. Stop and ask, or write `TODO(verify): <what and why>` and report it.

**After writing**
9. Run `typecheck`, `lint`, tests. A type error on a library symbol is a hallucination signal: go back to step 4, do not cast or suppress (`docs/03-standards/no-suppression.md`).
10. Add `Docs consulted:` to the PR/commit: source + version for each library API used, and each tool from step 3 that was unavailable or failed.

## Source hierarchy (highest wins)

This ranks sources when they disagree. It is not the order you open them: Context7 or a vendor's MCP server is often read first because it is fast, and it still loses to (1) and (2).

1. **Installed package types and lockfile version.** Ground truth for what exists in this project.
2. **Official docs for the installed version**, including its migration guide and changelog or release notes. TanStack doc pages can be read as Markdown by appending `.md` to the URL. Others: orm.drizzle.team, zod.dev, tailwindcss.com, ui.shadcn.com.
3. **Library docs via MCP (Context7), version-pinned.** Convenient and current, but indexes can mix versions or lag (descriptions may still say "alpha" after a stable release). Cross-check with (2) for anything that gates behavior.
4. **`docs/04-stack/*` in this repo.** Our decisions plus dated verified facts. If it conflicts with (1) or (2), the doc is wrong: fix it.
5. **Blog posts, tutorials, starter repos, third-party skills.** Hints only. Many pin to RC-era APIs.
6. **Model memory.** Never a source.

## Confidence labels

Use them in plans and reviews:
- **Verified**: checked against (1) or (2) this session.
- **Inferred**: reasoned from patterns, not checked.
- **Unknown**: could not determine.

Only **Verified** claims may drive implementation of library behavior.

## Stop-and-ask triggers

Stop and ask the human when:
- Two sources disagree and you cannot resolve it from (1) or (2).
- The docs describe a feature marked alpha, beta, experimental, or RC.
- The task needs a library, plugin, or MCP server not in `docs/04-stack/versions.md`.
- Docs for the installed version cannot be found.
- A fix would require disabling a type check, lint rule, or test (or editing the config that defines them).

## Assumptions that are not about libraries

A small, reversible choice the request leaves open (a label, an order of fields) does not need a question: make it and state it in the PR. Anything that changes scope, data, permissions, or a contract is a question. A fact about a library is never an assumption.

## Prohibited

- Inventing package names, flags, or config keys.
- Copying code from memory of "how it used to work".
- Silencing errors (`any`, `as unknown as`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, `eslint-disable`, skipped tests, weakened config) to get past a failure caused by an unverified API. Enforced mechanically: `docs/03-standards/no-suppression.md`.
- Presenting an Inferred claim as Verified.
