# Progressive Disclosure

**When to read:** when adding or editing documentation in this repo.

## The tiers

| Tier | Artifact | Size budget | Loaded |
|---|---|---|---|
| 0 | `AGENTS.md` | ≤ 120 lines | Every session |
| 1 | `docs/**/*.md` | ≤ 200 lines each | When the task matches the doc's "When to read" |
| 2 | Skills ≤ 150 lines each; templates have no line budget (their tier M minimum sections keep the filled copy short) | | When invoked |
| 3 | Official library docs (MCP / `.md` pages) | n/a | On demand, pinned to installed version |

An agent should be able to start work after reading Tier 0 plus one or two Tier 1 documents.

## Authoring rules

1. **One topic per file.** If a file needs two "When to read" lines, split it.
2. **Link, do not copy.** Never paste library documentation here. State our rule and point to the official source.
3. **Rules over prose.** Use MUST / MUST NOT / SHOULD. Each rule should be checkable in review.
4. **Short examples only**, and only if verified against current docs (add `last_verified`).
5. **Every Tier 1 document begins with "When to read"** so the agent can decide whether to open it.
6. **Stack documents carry front matter** with `applies_to`, `last_verified`, `verified_against`. `scripts/check-docs.mjs` flags entries older than 90 days.
7. **Update the index** in `docs/README.md` when adding, renaming, or removing a document.
8. **Do not duplicate rules** between files. The more specific document wins; the general one links to it.
9. **Writing style:** `docs/03-standards/writing.md`.

## When a document grows too large

Split by task, not by theme. Example: `tanstack-query.md` grows → keep core rules, move "mutations and optimistic updates" to its own file and link it from the "When to read" table in `AGENTS.md` only if agents need it often.
