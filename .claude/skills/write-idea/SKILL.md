---
name: write-idea
description: Capture an idea as a problem and pick the tier (pipeline phase 1). Use when the user brings a new feature, change, or request and no specs/<slug>/01-idea.md exists. Produces 01-idea.md, or the tier S issue for a small change.
---

# Write the idea

Pipeline phase 1. Output: `specs/<slug>/01-idea.md` from `docs/templates/idea.md` (tier S: an issue from `docs/templates/issue.md` instead). State the **problem**, never the solution. Read `docs/01-workflow/sdlc-pipeline.md` section 1 (tiers and triggers) first.

## Steps

1. Pick a kebab-case slug. Check `specs/*` and `src/features/*`: the idea may already exist, or belong inside an existing feature.
2. Restate the request as an observable problem: who has it, what happens today, how often. If the request is a solution ("add a CSV button"), ask what difficulty it removes. Ask at most 3 questions, only ones that change the tier or the problem; if nobody can answer, record each as **Unknown** or **Assumption** with an owner.
3. Choose the tier from the risk and L triggers in the pipeline, not from your sense of size. Highest tier wins; when unsure take the higher one. Put it in the `Tier:` line, write the triggers hit in section 1, and leave "Confirmed by" empty for a human. A file exists only for tiers M and L. Ask whether this is a team or personal project for `Approval mode:`; do not guess.
4. Tier S: fill the issue template (tier check, problem, acceptance criteria, test plan) and stop. Tiers M and L: fill the idea template; tier M minimum sections are named in it.
5. Discovery notes carry a source and a label (**Verified**, **Inferred**, **Unknown**). Do not write library API claims here; that is phase 2.
6. Fill "Existing features and systems touched" from `src/features/*`. A new cross-feature dependency makes it tier L.
7. Leave the decision box for the human. Do not tick "Proceed" yourself.

Before handing over, check the text against `docs/03-standards/writing.md`.

## Output
The file path, the tier with its triggers, and the open questions. Status stays `draft`; it becomes `done` when the Product Manager or Business Sponsor confirms the tier and fills `Decided by:` (or `dropped`). Next step is skill `write-research` (tier M with no unknowns: `write-prd`, with the reason).
