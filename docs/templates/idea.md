# Idea: <Feature name>

- Slug: `<feature-slug>` (folder `specs/<feature-slug>/`, file `01-idea.md`)
- Status: draft | done | dropped
- Decided by: <name> (Product Manager or Business Sponsor), <date> — format and authority: `docs/01-workflow/roles.md`
- Gate: none
- Tier: M | L (tier S uses `docs/templates/issue.md`, not this file; every later artifact repeats this value)
- Approval mode: team | personal (a human confirms it with the tier; `docs/01-workflow/sdlc-pipeline.md`, section 4)
- Owner: <human who owns the problem>
- Author: <human, or "AI agent">
- Date: YYYY-MM-DD

Keep this to about one page. It captures the **problem** and the decision to go on, not the design. Solution detail belongs to the PRD (what) and the feature spec (how). Every factual claim has a source and a label: **Verified** (checked, source given), **Inferred**, or **Unknown**. Tier M minimum: sections 1, 2, 3, 4, 10 (write "n/a" in the rest).

## 1. Tier (required)
Why this tier (the `Tier:` line above). Triggers hit (from `docs/01-workflow/sdlc-pipeline.md`): <list, or "none">.
Confirmed by: <human>, <date>. Highest tier wins; when unsure, take the higher one.

## 2. Problem
Who has it, what happens today, and how often. State it as an observable difficulty, not as a missing feature.
- Wrong: "Add a CSV export button."
- Right: "Finance re-keys every invoice into the ledger by hand, about 2 hours a month (source: <who said it, when>)."

**Evidence** (how do we know this is real?): <tickets, interviews, logs, data, with source and date>. If there is none, write **Unknown**.
**Who is affected:** <roles and rough number of people>.
**If we do nothing:** <what it costs, or what gets worse, and any deadline>.

## 3. Desired outcome
What will be different when this works, in observable terms. A rough way to tell is enough here; the PRD fixes the metric with its target, window, and data source.

## 4. Non-goals (first cut)
What this idea deliberately does not try to solve.

## 5. Solution hypothesis (optional, not binding)
How the owner currently pictures it, in a few lines. This is a starting point, not a requirement; the PRD and feature spec may replace it.
**Alternatives considered:** do nothing · use an existing feature or tool · change a process · build (this idea). One line each on why not.

## 6. Existing features and systems touched
Check `src/features/*` first: this may belong inside an existing feature instead of a new one.

| Feature or system | How it is involved | Via |
|---|---|---|
| `<feature>` | <reads its data, reacts to its event, …> | public API (`index.ts` / `index.server.ts`) · in-process event · none yet |

Cross-feature calls go through the other feature's public API; events are in-process and typed (`docs/02-architecture/modular-monolith.md`). Any new cross-feature dependency makes this tier L.

## 7. Discovery notes
Prior art, existing solutions, constraints (legal, budget, deadline, accessibility), stakeholders to consult. One line each:
`<finding> · source: <URL, doc, or person> · date · Verified | Inferred | Unknown`
Do not write library API claims here. Technical research with official docs and versions is phase 2 (`02-research.md`).

## 8. Risks and known unknowns
| Item | Kind (product / technical / data / security) | How it gets resolved (research question · prototype · PRD question · owner decision) |
|---|---|---|

## 9. Open questions and assumptions
Each assumption is labeled **Assumption** and has an owner who confirms it. Unknowns stay visible here.

## 10. Decision
- [ ] Proceed to research (tier L, and tier M with unknowns), or straight to the PRD (tier M with no unknowns: say why). For tier S the issue with acceptance criteria is enough
- [ ] More discovery first: <what, who, by when>
- [ ] Drop: <why>


## References
Links, screenshots, inspiration. Optional.
