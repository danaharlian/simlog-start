---
name: add-db-table
description: Add or change a PostgreSQL table with Drizzle safely (schema in the owning feature, generated and reviewed migration, repository, tests). Use for any schema change.
---

# Add or change a table

Read `docs/03-standards/database.md` and `docs/04-stack/drizzle-postgres.md`. Run `verify-library-docs` for `drizzle-orm` and `drizzle-kit` at the installed versions before writing schema or config: relation and query APIs differ across Drizzle majors. Skill `drizzle` explains `drizzle-kit` responses and errors; where it differs from these steps, these steps win (`docs/05-agent-tooling/skills.md`).

## Steps

1. **Ownership:** confirm which feature owns the table (one owner). A reference to another feature's table holds only the id. Whether it also gets a foreign key is chosen per relation (`database.md`); if so, it is a custom migration with no `CASCADE`, because lint rejects importing that table.
2. **Schema:** define the table in `features/<f>/db/schema.ts` and **export it directly**: `drizzle-kit` finds nothing inside a wrapper object, and still exits 0. Conventions: `database.md` (names, `timestamps`, `NOT NULL`, explicit `onDelete`, `uuid` primary key). Add indexes for FKs and for filter/sort columns used by list queries. Auth tables are the exception: they come from the Better Auth CLI, never by hand (`docs/04-stack/better-auth.md`, rule 5), and then continue at step 3.
   **Races go into the schema too.** For each write two requests can make at once on this table (the spec's section 4, "Transactions and concurrency", names them), pick the mechanism from the table in `docs/04-stack/drizzle-concurrency.md` and add what it needs in this change: a unique index (on `lower(...)` when case does not count), a foreign key with `RESTRICT`, a `version` column for a table people edit through a form, or a column the write's `WHERE` can test. A check in the service is not a mechanism.
3. **Generate the migration** with the MCP tool `generate` (`name: <kebab-name>`) when it is available, otherwise the `db:generate` script (`drizzle-kit generate --name <kebab-name>`). `missing_hints`: answer with skill `drizzle`, `hints.md`; a real rename is a `rename`, and when you cannot tell, ask. **Read the generated SQL**, because the tool returns only its path and writes a `DROP COLUMN` with no hint (observed). Check it against the table in `database.md`: destructive statements, a new `NOT NULL` column on a table with rows (fails at `migrate`), removing an enum value still in use, a rename (needs `--hints`), locks on large tables, and backfill needs (`generate --custom`).
4. **Check** with the MCP tool `check` (or `pnpm exec drizzle-kit check`). A `schema_changed` warning means the schema and the migrations differ. A `conflicts` error: stop and ask; an agent does not run `fix_conflicts`.
5. **Never** hand-edit a migration that has been merged or applied elsewhere. Fix forward with a new migration.
6. **Apply** locally with `drizzle-kit migrate` (the `db:migrate` script); the MCP server has no `migrate` tool. An agent never runs `push`, and a hook blocks it. A person may, in local throwaway prototyping; never in CI/staging/production.
7. **Repository:** add queries in `server/*.repository.ts`, with `DbOrTx` as the first argument; name columns; scope by tenant/owner; map rows to DTOs. For a multi-write, read "Transactions" in `drizzle-postgres.md`: a returned `Result` does not roll back.
8. **Tests:** integration tests against a real PostgreSQL instance covering constraints (unique, FK), scoping, and the migration applying cleanly from scratch.
9. **Related code:** a changed column also changes the feature's `schemas.ts`, DTOs, server functions, and any form mapper. Search for the column name before you finish.
10. **Document:** update the feature `README.md` (owned tables) and note reversibility in the PR (reversible / forward-only, with reason).

## Checklist

- [ ] Generated SQL reviewed and committed with the schema change; `check` reports no conflict and no warning
- [ ] No data-loss risk, or called out explicitly for human approval
- [ ] Indexes justified; no N+1 introduced
- [ ] Each collision point on this table has its mechanism in the schema or in the write, and a test that runs the colliding writes together against a real database (`drizzle-concurrency.md`, `docs/03-standards/testing.md` rule 1b)
- [ ] `Docs consulted` lists Drizzle docs for the installed major
