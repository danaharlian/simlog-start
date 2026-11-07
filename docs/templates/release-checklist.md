# Release Checklist: <Feature name>

- Slug: `<feature-slug>` (file `10-release.md`)
- Version / date: <build id, date>
- Status: draft | in review | approved | dropped
- Gate: Release gate
- Release owner: <human>
- Approved by: <name> (Release Owner), <date> — format and authority: `docs/01-workflow/roles.md`
- Feature Spec rollout plan: `06-feature-spec.md`, rollout and rollback section. Followed as written? yes / no (deviations and why: <…>)

## What ships
Tasks and PRs: <T1 → PR link, T2 → PR link, …> · Migrations: <names, order> · New env vars: <names> · Build or commit: <id>

## Before
- [ ] All tasks merged; PR gates passed (every task has a passed round in `08-review-log.md`); `09-qa.md` has no open blocking item (defined in its defects section: an open Critical or High, or a failed Must criterion) and its overall result is pass or pass with accepted risks.
- [ ] Migrations: order stated; additive changes first, destructive in a later release; reversible? yes/no (if no, say why it is acceptable).
- [ ] Env vars in `.env.example` exist in the staging and production secret stores (names only here).
- [ ] Rollback written below and checked by someone other than the author.

## Release
- [ ] Production deploy, by a human, only after this gate (`main` reaches staging by itself; `docs/01-workflow/sdlc-pipeline.md`, section 3). Deploy steps (platform-specific: `TODO(verify)` until the deploy platform steps are documented; runtime is Node in a container, ADR 0007). Do not paste commands from memory.
- [ ] Smoke test (list the 3 to 5 checks and the result). Include a real page and a server function: a bad env can leave the page at 200 (`docs/03-standards/environment.md`).

## Rollback
PRD rollback trigger and accountable owner: <copied from `04-prd.md`>. How to return to the previous version, what happens to data written since, and who decides.

## Operational readiness
- [ ] Release notes written: <link>.
- [ ] Monitoring and alerts cover the changed paths: <what>. Incident contact for the first window: <who>.
- [ ] Business acceptance from the Product Owner when the PRD requires it: <name, date, or "not required">.

## After
- [ ] Monitoring or logs checked for errors for the agreed window (what was looked at, by whom).
- [ ] Next: `11-learnings.md` now, without waiting for the metric. Measure phase scheduled (`12-measure.md`): window from the PRD starts on <release date>; post-release review date and owner from the PRD: <…>.

## Gate review
Filled by the reviewer (`docs/01-workflow/sdlc-pipeline.md`, section 4).

| Round | Date | Reviewer | Verdict (approve · approve with notes · changes requested · drop) | Findings, or notes and their owner |
|---|---|---|---|---|
