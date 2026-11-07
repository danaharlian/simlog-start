# Research: <Feature name>

- Slug: `<feature-slug>` (folder `specs/<feature-slug>/`, file `02-research.md`)
- Idea: `01-idea.md` (decision: proceed)
- Status: draft | done | dropped
- Decided by: <name> (Product Manager), <date> — format and authority: `docs/01-workflow/roles.md`
- Gate: none
- Tier after research: S | M | L (changed from `01-idea.md`? yes / no, see section 6)
- Author: <human, or "AI agent">
- Date: YYYY-MM-DD

Tier M minimum: Summary, Questions investigated, Libraries and tools, Recommendation (write "n/a" in the rest). Tier L: all sections.

This phase **finds out facts and answers unknowns**; it does not make the design. Decisions (modules, data model, contracts, security rules, UI structure) belong to the architecture review and the feature spec, which read this file. Do not write a design here and then again later.

Every claim has a source and a label: **Verified** (checked against the installed types or official docs for the installed version), **Inferred** (reasoned, not checked), or **Unknown**. No source, no claim. Source levels follow `docs/00-principles/anti-hallucination.md`: 1 installed types, 2 official docs for the installed version, 3 Context7, 4 this repo's `docs/04-stack/*`, 5 blogs and tutorials (hints only). Memory is never a source. Fetch docs through MCP (`docs/05-agent-tooling/mcp.md`, skill `verify-library-docs`).

## 1. Summary (answer first)
In 3 to 5 lines: can this be built with the installed stack? The one or two findings that matter most, the biggest remaining risk, and the recommendation.

## 2. Questions investigated
Start from the risks and known unknowns in `01-idea.md`. Validate the problem first: who has it, how they cope today, and what competitors do. Then whether it can be built. One row per question; add questions you discover. A question the PRD or a later phase raises is added here as a dated row, and the file stays `done`.

| # | Area (user · market · competitor · problem validation · feasibility · architecture · data · security · UI · integration · performance) | Question | Finding | Source (URL, library@version, level 1 to 5) | Label | Consequence for the design |
|---|---|---|---|---|---|---|

## 3. Libraries and tools
Only what this feature would use. Installed versions come from `package.json` and the lockfile, never from memory.

| Library or tool | Needed for | Installed version (or "not installed") | Docs version consulted | Context7 ID (if used, e.g. `/org/project`) | Source URL | `@deprecated`, alpha, beta, or RC? | ADR needed? |
|---|---|---|---|---|---|---|---|

A library that is not installed (a new dependency), or an alpha, beta, or RC feature, needs an ADR before use (`docs/04-stack/versions.md`, rule 3) and is an L trigger or a stop-and-ask item. Check the installed `.d.ts` for `@deprecated` on every API you intend to use.

## 4. Options (only where more than one approach is viable)
Present evidence, not a decision. The architecture review (tier M: the feature spec) decides and records an ADR if the choice is architectural.

| Option | What it means | Evidence (source) | Pros | Cons | Fit with `docs/02-architecture/modular-monolith.md` |
|---|---|---|---|---|---|

Leaning: <option> because <reason from the evidence>, or "no preference".

## 5. Is a prototype needed?
Docs cannot settle every question. Name the riskiest one left, if any: **Hypothesis:** <one sentence that can turn out false> · **Why docs do not settle it:** <…> · **Who must judge it:** <…>. Next phase: `03-prototype.md` (`docs/templates/prototype.md`). None: write "none", and the PRD's `Prototype:` line carries the reason.

## 6. Impact on tier and scope
- New risk or L triggers found (from `docs/01-workflow/sdlc-pipeline.md`): <list, or "none">. If any: tier changes to <S|M|L>, a human confirms.
- What the PRD must take into account: <limits, ruled-out options, or "none">. A later finding that changes an approved requirement goes through the PRD's change log and gate.
- Features that this work would touch (from `src/features/*`): <list>. A new cross-feature dependency makes it tier L.

## 7. Risks
| Risk | Impact (high · medium · low) | Evidence or source | Suggested mitigation (for the spec to decide) |
|---|---|---|---|

## 8. Remaining unknowns and stop-and-ask items
Stop and ask when sources disagree, the docs describe an alpha, beta, or experimental feature, the library is not in `docs/04-stack/versions.md`, or docs for the installed version cannot be found.

| Item | Why it is unresolved | Who decides | Blocks the PRD? |
|---|---|---|---|

## 9. Docs consulted
Copy this list into the PR description's `Docs consulted:` line later.
- <library@version>: <URL> · <date checked>

## 10. Recommendation
- [ ] Proceed to the prototype (section 5) or the PRD. **Decisions later phases must make:** <list>
- [ ] Needs clarification first: <what, who>
- [ ] Stop: <why this should not be built as asked>
