---
name: verify-library-docs
description: Verify a library API, option, config key, or CLI command against the installed version and official docs before writing code. Use whenever code will call TanStack, Drizzle, Zod, Tailwind, shadcn/ui, Vite, or any dependency, and whenever you feel "pretty sure" about an API.
---

# Verify library docs

Goal: replace memory with checked facts and produce a `Docs consulted` entry.

## Steps

1. **Installed version.** Read `package.json` and the lockfile for each library involved. Note exact versions. If a library is missing, stop: adding it needs an ADR.
2. **Our rules.** Read `docs/04-stack/<library>.md`. Note rules and the "Verify before use" list.
3. **Check tools.** Note whether Context7 and the library's MCP server (if `docs/05-agent-tooling/mcp.md` lists one) are used, unavailable, or failed. For a failed one, take the fallback in that file's "When a tool is unavailable or lacks an answer". Never report a tool as used because you meant to run it.
4. **Resolve docs (Context7).** `resolve-library-id` with the official name and your question; choose the ID whose version list includes the installed version. Details: `docs/05-agent-tooling/mcp.md`. For Better Auth, use the MCP server `better-auth` first, as that file says: it has the installed 1.7 line, and "No documentation found" can mean a wrong version identifier.
5. **Query one concept at a time** with `query-docs` (`language: TypeScript`, versioned ID if available). Max 3 calls per question; reformulate instead of repeating.
6. **Cross-check** anything that gates behavior (renamed/removed APIs, config keys, defaults) on the official page. Find the page through the site's `llms.txt` (`docs/05-agent-tooling/mcp.md`, "`llms.txt`"), not from a URL you remember; a Context7 source link can point to a repository's main branch instead of the installed version. TanStack pages can be fetched as Markdown by appending `.md`. Look at the page's version banner, and any migration guide, changelog, or release notes that cover the installed version.
7. **Check types.** Open the installed package's `.d.ts` for the exact signature if the API is type-heavy (generics, builders, middleware). For `drizzle-kit` behavior, read skill `drizzle`, and compare its `metadata.revision` with `pnpm exec drizzle-kit skills version`: equal means it describes the installed version. The Better Auth skills have no version, so an API they name still needs a source above.
8. **Resolve conflicts.** Installed types > official docs for installed version > Context7 > our docs > blogs/tutorials > memory. This ranks sources; it is not the order you read them. If two high-priority sources disagree, stop and ask.
9. **If still unverifiable:** do not write the code. Report what you could not verify, or leave `TODO(verify): <what>`.

## Output (paste into the plan, PR, or commit)

```
Docs consulted:
- <library>@<installed version>: <API/concept> — <source URL> (checked <YYYY-MM-DD>)
Tools:
- <all used | tool: unavailable or failed, and the fallback taken>
Unverified:
- <none | item and why>
```

## Red flags: re-verify immediately

- The API name changed between a beta/RC and stable (e.g. server function validators).
- A tutorial or skill references an old package name or an older major.
- A type error or `@deprecated` warning appears on a library symbol, even one you verified: go back to steps 6 and 7, never cast or suppress.
- Docs index description says alpha/beta/RC while the project uses a stable release.

If the docs differ from `docs/04-stack/*`, update that doc (and `last_verified`) in the same PR.
