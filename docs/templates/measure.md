# Measure: <Feature name>

- Slug: `<feature-slug>` (file `12-measure.md`)
- Status: draft | done
- Decided by: <name> (Product Manager or Business Owner), <date> — format and authority: `docs/01-workflow/roles.md`
- Gate: none
- PRD metric: <copied from `04-prd.md`: name, baseline, target, window, data source, owner>
- Released: <date, from `10-release.md`>
- Measured by: <human or "AI agent">, instrumentation planned in the feature spec section on observability: <yes / none yet>
- Measured on: YYYY-MM-DD (window: <from> to <to>)

## Result
| Metric | Baseline | Target | Actual | Source of the number |
|---|---|---|---|---|

If the metric cannot be measured (no data source or tooling yet), write **Unknown** here, say what is missing, and open a follow-up. Never claim success without data.

Add the other KPIs the PRD names (activation, retention, error rate, availability, cost), each with its source. Instrumentation comes from the PRD and the feature spec's section 10.

## Decision
Keep as is | iterate (what and why) | roll back or remove (why).

**Updated product hypothesis:** what this result changes in what we believe about the problem.

## Follow-ups
This file closes the feature, with `11-learnings.md` already done.
Tickets created (link), and anything that should change in the PRD template or the pipeline.
