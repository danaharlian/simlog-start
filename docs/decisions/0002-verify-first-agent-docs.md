# 0002 Verify-first agent documentation

- Status: accepted
- Date: 2026-10-15

## Context

Agents hallucinate or misremember library APIs, especially in fast-moving ecosystems. Concrete case on this date: TanStack Start's server-function validator was `.validator()`, became `.inputValidator()` during beta/RC, and returned to `.validator()` in 1.0 stable (`.inputValidator()` removed). Copying library docs into this repo would go stale the same way.

## Decision

1. This repo stores **decisions, rules, and verified facts with dates**, not copies of library documentation.
2. Agents MUST verify library APIs against the installed version using MCP/official docs before writing code (`AGENTS.md` rule zero).
3. PRs record `Docs consulted:`.
4. Stack documents carry `last_verified`; CI flags entries older than 90 days.
5. Type-check, lint, and tests are the final arbiter.

## Consequences

- Positive: fewer hallucinated APIs, docs stay small and durable, upgrades are cheaper.
- Negative: agents spend extra tool calls on lookups; requires MCP availability (fallbacks defined in `docs/05-agent-tooling/mcp.md`).

## Alternatives considered

- Vendoring library docs into the repo: stale quickly, large context cost.
- Relying on model knowledge only: unacceptable error rate for this stack.
