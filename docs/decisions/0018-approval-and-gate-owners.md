# 0018 Approval modes, merged gates, language of specs, and a narrower ADR exception

- Status: accepted (`via chat` quote and tier checks added by ADR 0019; gate owners and the merged-gate check replaced by ADR 0020)
- Date: 2026-10-31
- Deciders: owner (all four decisions, including the changes to `scripts/check-docs.mjs`)
- Extends: ADR 0017

## Context

After ADR 0017 the owner was asked four questions the agent had answered alone. Checking the answers against the script found that the written rules and the check disagreed:

1. The pipeline said an approved artifact has a name and date in "Approved by", and the script never read that line.
2. All of `docs/decisions/` skipped the check for old artifact names, which let a stale name stay in `docs/decisions/README.md`.
3. A tier M task breakdown was exempt from its Gate review, so reviewing together removed the tasks questions, not only a stop.
4. Tier L tasks had to use `Tasks gate`, with no way to record that one person reviewed both gates.

## Decision

1. **ADR exception, as narrow as possible.** Only 0005, 0016, and 0017 skip the check for old artifact names, by exact path. They skip that check only: their links are still checked, and a new ADR, or `docs/decisions/README.md`, is checked in full.
2. **Approval.** `01-idea.md` states `Approval mode: team | personal`, confirmed by a human.
   - `team`: the reviewer's edit of the file, or the official review mechanism recorded as `via review <link>`.
   - `personal`: an explicit message naming the artifact and the verdict may be recorded by an agent as `via chat`, with the identity it knows and the date.
   - In both, an agent never approves its own work or sets `approved` without an explicit human approval, and a passing check is not one.
3. **Gate owners.** The defaults are in `sdlc-pipeline.md`, section 4. The product owner's part of the Spec gate covers UI and product behavior. When one person owns both, Spec and Tasks may be reviewed together. That removes a stop and keeps both sets of questions, so the task breakdown always has its own Gate review, in every tier.
4. **Language.** `docs/`, skills, and templates are in English. The text of `specs/` may be in Indonesian. File names, header fields and their values, the Gate review heading and its columns, verdict words, and ids are not translated, because the check or a later phase reads them.

## Changes to `scripts/check-docs.mjs`

| Change | Direction |
|---|---|
| The exception for old names moved from all of `docs/decisions/` to three named ADRs | Stricter |
| An approved artifact needs `Approved by:` as name, date, and an optional `via chat` or `via review <link>` | Stricter |
| An agent's name is rejected in `Approved by:` and as the last round's reviewer | Stricter |
| `via chat` is rejected unless `Approval mode` is `personal`; a final idea needs a valid mode | Stricter |
| A tier M task breakdown needs its own Gate review; only a tier M PRD stays exempt | Stricter |
| Merged gates, and tier M: the last reviewers of spec and tasks must match | Stricter |
| Templates must hold the fields these checks read | Stricter |

## Consequences

- **The check reads text.** It cannot tell who wrote a name, or whether a chat message existed. A false name passes. Git history and the reviewer remain the evidence, and this is a guardrail against mistakes, not against forgery.
- **The agent name list is short and can miss a name,** or match a person called Cursor or Gemini; the list is `AGENT_NAME` in the script.
- **Project mode can be misstated,** as a tier can (ADR 0017). A human confirms both in `01-idea.md`.
- **The PR gate is not checked for approval:** `08-review-log.md` has `Status: done`, and branch protection holds that gate. Its template asks for the same source.
- **Apps with approved artifacts from before this ADR** fail `check:docs` until each has a valid `Approved by:` and a mode in its idea file.
- A filled template must drop the hint in its `Approved by:` line, because it contains `<link>`, and the placeholder check reports it with its line number.

## Not verified

- These rules on a real feature, or with a real product owner reviewing Indonesian text.
- An agent actually refusing to record a vague "OK" as approval: `run-pipeline` says so, and no tool can check it.
- The installer on a real app with this version.

## Alternatives considered

- **Keep the exception on all of `docs/decisions/`.** Simpler, and it hid the stale README name. Rejected by the owner's request for the narrowest form.
- **A separate `via chat` record file for personal projects.** More evidence and more steps; the Gate review row and the date were judged enough.
- **Per-repo approval mode instead of per feature.** One place, but no file holds it in an app, and the check reads `specs/<slug>/`.
- **Translating field names per language.** The check would need a dictionary, and two spellings of one status.

## Verification

Docs consulted: none for library APIs; none were added. The matrix below (35 cases, all as expected) ran on 2026-10-31 on a copy of this repo with the applied script. Its specs were built from the real templates, with their placeholders removed and Gate review rounds added. It is a throwaway script and is not kept in this repo.

| Area | Input | Result |
|---|---|---|
| Whole chain | Tier L, all 12 templates, team mode, Indonesian text; tier M; merged gates in tier L; personal with `via chat`; team with `via review` | Clean |
| Approval | Missing, no date, or malformed line; an agent's name; `via chat` in team mode; a chat link with no valid mode | Error |
| Gate review | Agent as reviewer; tier M tasks with no table; merged gates with different reviewers; a translated column | Error |
| Language | Translated status, field, or verdict | Error |
| ADR exception | 0005 with its old names | Clean |
| ADR exception | Old name in a new ADR or in `decisions/README.md`; a broken link in 0005 | Error |
| Templates | A template missing `Approved by:`, `Approval mode:`, or its Gate review | Error |
