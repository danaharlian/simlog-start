# Prototype: <Feature name>

- Slug: `<feature-slug>` (file `03-prototype.md`)
- Research: `02-research.md` (section 5 names the hypothesis)
- Status: draft | done | dropped
- Decided by: <name> (Product Manager or Product Design Lead), <date> — format and authority: `docs/01-workflow/roles.md`
- Gate: none
- Author: <human, or "AI agent">
- Seen by: <product owner or the person who must judge it>, <date>
- Date: YYYY-MM-DD

Run this phase only for a risky hypothesis: something research could not settle, or a flow nobody can judge from text. Otherwise skip it and say why in the PRD's `Prototype:` line. Tier M minimum: sections 1, 2, 3. Write "n/a" in the rest.

The code is throwaway. It is never merged; phase 8 rewrites what is needed, to the standards. The prototype informs the PRD and does not decide it.

## 1. Hypothesis
One sentence that can turn out false, and what would change if it does.
- Wrong: "See if the form works."
- Right: "Staff can choose the right unit from a list filtered by warehouse without a second lookup. If not, the PRD needs a search instead of a dropdown."

## 2. What was built
Branch: `spike/<slug>` · Time-box: <e.g. half a day> · What it fakes or leaves out: <…>.

## 3. Result and evidence
Command output, a measurement, or what a named person did with it. Not an opinion about the code.

| Question | Result | Evidence | Consequence for the PRD or spec |
|---|---|---|---|

**Carries forward:** knowledge only. **Branch deleted when:** <at close-out, at the latest>.

## 4. User flow (UI only)
Steps as the user sees them, and what the system answers at each one. Include one failure.

```text
<user does X> → <system answers Y> → <user sees Z>
```

## 5. Layout sketch (UI only)
Rough boxes per page or panel: regions, main content, the primary action, where empty, loading, and error states appear. It fixes structure, not styling. The feature spec's section 8 refers to this sketch instead of drawing it again.

```text
+--------------------------------------+
| header: title            [Primary]   |
+----------------+---------------------+
| filters        | table (rows)        |
|                | empty / error state |
+----------------+---------------------+
```

## 6. Open points for the PRD
| Point | Who decides | Why it is still open |
|---|---|---|
