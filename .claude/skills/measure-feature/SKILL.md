---
name: measure-feature
description: Compare the PRD success metric with its target in its measurement window after release (pipeline phase 12). Use when the PRD's window has elapsed or a human asks whether a released feature worked. Produces 12-measure.md.
---

# Measure the feature

Pipeline phase 12. Output: `specs/<slug>/12-measure.md` from `docs/templates/measure.md`. Inputs: the PRD's metrics table (baseline, target, window, data source, owner), the spec's instrumentation section, `10-release.md` (release date).

## Steps

1. Copy the metric row from the PRD unchanged. Confirm the window has elapsed from the release date; if not, stop and say when it ends.
2. Find the number only where the PRD or spec says it is recorded. If there is no data source or tooling (analytics are not decided), write **Unknown**, say exactly what is missing, and open a follow-up. Never claim success, or estimate, without data.
3. Record the actual value with its source (query, dashboard, date range) so another person can reproduce it. Do not round toward the target.
4. Compare with baseline and target. If the baseline was Unknown, say the result is absolute only.
5. Propose the decision (keep · iterate · roll back), with reasons. The decision belongs to the PRD's post-release review owner; leave it for them.
6. List follow-ups as tickets, including any change the PRD template or pipeline needs.

## Output
The file path, the metric result or Unknown, the proposed decision, and the follow-ups. Once the result (or Unknown) and follow-ups are written, stop: `done` needs `Decided by:` from the Product Manager or Business Owner. With `11-learnings.md` done, this closes the feature.
