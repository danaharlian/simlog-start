---
name: write-tasks
description: Break a drafted feature spec into vertical tasks, one PR each, riskiest first, with a coverage check (pipeline phase 7). Use after the Spec gate (tier M or merged gates: right after the spec is drafted). Produces 07-tasks.md for the Tasks gate (tier M: the Spec gate).
---

# Write the task breakdown

Pipeline phase 7. Input: `06-feature-spec.md`. Output: `specs/<slug>/07-tasks.md` from `docs/templates/tasks.md`. Rules are at the top of that template; read them.

## Steps

1. List the spec's riskiest unknown first. The first task is the thinnest **end-to-end** path (database to UI) through it, not "the schema". It also proves, with one named test each, every assumption no code has proven yet: a finding labelled **Inferred** in `02-research.md` that the spec relies on, and a section 5 hypothesis no prototype tested. If one turns out false, the build stops and the spec changes first (step 9).
2. Cut vertical tasks: each leaves `main` releasable, covers named AC and NFR ids, and fits one reviewable PR (target 400 changed lines, excluding generated files and migrations). Never a task per layer.
3. Fill the overview table (outcome, risk and why, dependencies, AC and NFR covered). Order by risk unless a dependency forces otherwise; say why. Dependencies live only here: no second diagram.
4. Per task, write the detail block: spec rows delivered, **files this task may change** (from the layer breakdown, covering everything the description asks for), tests written first (AC → test name, including each permission rule), what to read first, migration, env and ADR, public API or events added, and the "done when" line.
5. A task that adds a public API or event updates `index.ts` (and `index.server.ts` for server-only exports) and the feature `README.md`; tasks that consume it depend on that task.
6. Run the coverage check: every in-scope PRD item, every public export the architecture review promises, every AC and NFR with its own verification, every row of the spec's test strategy (section 11) and layer breakdown (section 3) lands in some task. List anything uncovered with a reason.
7. Decide which task first links the feature from the UI; until then the entry point stays unlinked.
8. Do not put review, QA, docs, or retro as tasks; they are phases and gates.
9. If breaking down the work shows the spec is wrong, stop: the spec changes first, through its change log and gate.

Before handing over, check the text against `docs/03-standards/writing.md`.

## Output
The file path, task count, the first task, and any uncovered item. Set the status to `in review` and `Gate:` to `Tasks gate` (tier M: `Spec gate`, with the feature spec); `approved` follows the approval rule (`docs/01-workflow/sdlc-pipeline.md`, section 4).
