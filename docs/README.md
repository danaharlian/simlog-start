# Docs Index

Read only what the task needs. Every document starts with **When to read**.

**Setup and update:** run `bash /path/to/ai-coding-docs/install.sh` from the app root once (see the root `README.md`); re-run it to take a newer version of these docs. `--help` lists the options. The installer is the only supported setup path: do not copy files from `docs/examples/` by hand (they are the installer's source and stay in `docs/examples/`).

## 00 Principles
- [anti-hallucination.md](00-principles/anti-hallucination.md): the verify-before-write protocol, source hierarchy, stop conditions
- [progressive-disclosure.md](00-principles/progressive-disclosure.md): how these docs are layered and how to keep them small

## 01 Workflow
- [sdlc-pipeline.md](01-workflow/sdlc-pipeline.md): 12 phases, 6 human gates, tiers S/M/L by size and risk
- [roles.md](01-workflow/roles.md): who is accountable, who decides each phase, how to record it, combining roles
- [definition-of-done.md](01-workflow/definition-of-done.md): checklist before a change is "done"

## 02 Architecture
- [modular-monolith.md](02-architecture/modular-monolith.md): modules, public APIs, dependency rules, layers
- [design-principles.md](02-architecture/design-principles.md): SOLID mapped to this repo, abstraction gate, what lint checks vs review
- [folder-structure.md](02-architecture/folder-structure.md): where every file goes, naming conventions
- [cross-feature-communication.md](02-architecture/cross-feature-communication.md): two public entry points, call vs event, typed in-process events
- [state-management.md](02-architecture/state-management.md): where each kind of state lives, which cache layer to use
- [data-fetching.md](02-architecture/data-fetching.md): choosing a server function, server route, or loader mode; observed behavior

## 03 Standards (stack-neutral)
- [coding-standards.md](03-standards/coding-standards.md): the five rules, priority order, repeating code, one owner per fact, and a map to the detail
- [writing.md](03-standards/writing.md): how specs, ADRs, PR text, and docs are written; what gets sent back as filler
- [conventions.md](03-standards/conventions.md): naming symbols, syntax lint decides, imports, comments, formatting
- [components.md](03-standards/components.md): component placement, template, SSR-safe rendering, size, compound components, accessibility
- [typescript.md](03-standards/typescript.md)
- [error-handling.md](03-standards/error-handling.md)
- [logging.md](03-standards/logging.md): the logger, what redaction misses, levels, what may be logged
- [glossary.md](03-standards/glossary.md): what each term means in code; business terms per project
- [api-conventions.md](03-standards/api-conventions.md)
- [database.md](03-standards/database.md): naming, standard columns, enums, relations, indexes, migrations, seeds, types
- [testing.md](03-standards/testing.md)
- [linting-and-formatting.md](03-standards/linting-and-formatting.md)
- [no-suppression.md](03-standards/no-suppression.md)
- [git-and-commits.md](03-standards/git-and-commits.md)
- [environment.md](03-standards/environment.md)
- [security.md](03-standards/security.md)

## 04 Stack (library-specific rules, with `last_verified` dates)
- [versions.md](04-stack/versions.md)
- [tanstack-start.md](04-stack/tanstack-start.md)
- [tanstack-router.md](04-stack/tanstack-router.md)
- [tanstack-query.md](04-stack/tanstack-query.md)
- [tanstack-form.md](04-stack/tanstack-form.md)
- [tanstack-table.md](04-stack/tanstack-table.md)
- [drizzle-postgres.md](04-stack/drizzle-postgres.md)
- [drizzle-concurrency.md](04-stack/drizzle-concurrency.md)
- [zod.md](04-stack/zod.md)
- [better-auth.md](04-stack/better-auth.md)
- [tailwind-shadcn.md](04-stack/tailwind-shadcn.md)

## 05 Agent tooling
- [mcp.md](05-agent-tooling/mcp.md): MCP servers, how to query docs, security
- [skills.md](05-agent-tooling/skills.md): repo skills, TanStack Intent, trust model

## Decisions and templates
- [decisions/](decisions/README.md): ADRs and open decisions
- [templates/](templates/): tier S issue, idea, research, prototype, PRD, architecture review, feature spec, tasks, review log, QA, release checklist, learnings, measure, ADR, PR checklist
