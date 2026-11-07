---
name: write-research
description: Research the unknowns of a captured idea against the installed stack and official docs, and name any hypothesis that needs a prototype (pipeline phase 2). Use after the idea is done and before the PRD. Produces 02-research.md.
---

# Write the research

Pipeline phase 2. Input: `specs/<slug>/01-idea.md`. Output: `specs/<slug>/02-research.md` from `docs/templates/research.md`. Research **finds facts and answers unknowns**; it does not design. Source levels: `docs/00-principles/anti-hallucination.md`. Tier M with no unknowns skips this phase; the PRD's `Research:` line says why.

## Steps

1. Collect the questions: whether the problem is real (users, competitors, how people cope today), the idea's risks and unknowns, and anything the problem needs that the stack might not support. One row each in "Questions investigated".
2. For every library the feature would use, read `package.json` and the lockfile for the **installed version** (never memory), then follow skill `verify-library-docs`. Fill the libraries table, including whether the installed `.d.ts` marks an API `@deprecated`.
3. A library that is not installed, or a feature marked alpha, beta, or RC, is an ADR need and a stop-and-ask item. Record it; do not work around it.
4. Where more than one approach is viable, list options with evidence and pros and cons, and state a leaning. Do not choose; the architecture review (tier M: the feature spec) does.
5. Name the riskiest hypothesis the docs cannot settle, if any, in section 5. It goes to skill `write-prototype`; do not build it here.
6. Re-check the tier: any new L trigger goes back to the human.
7. In the libraries table, fill the Context7 ID column when you used Context7 (resolve it once; later phases reuse it). Every finding has a source URL (or installed type), a level, and a label. No source, no claim. Fill "Docs consulted" so it can be copied into PRs.
8. End with what the PRD must take into account, and the **decisions later phases must make**.
9. A question raised after this file is `done` is added as a dated row, and the status stays `done`.

Before handing over, check the text against `docs/03-standards/writing.md`.

## Output
The file path, the three findings that matter most, remaining unknowns, any hypothesis for a prototype, and any tier change. When the recommendation is written, stop and ask the Product Manager whether the problem is validated. `done` needs their `Decided by:`; `dropped` if the work stops.
