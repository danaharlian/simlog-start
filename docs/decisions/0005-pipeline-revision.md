# 0005 Pipeline revision: 10 phases, 4 gates, tiers by risk

- Status: accepted (phase order and gates replaced by ADR 0017)
- Date: 2026-10-24
- Deciders: repository owner (approved the revision after reviewing external feedback)

## Context

The first pipeline had 12 phases copied from the owner's example flow: idea, research, prototype, architecture review, PRD, feature spec, task breakdown, execution, code review, QA, docs update, learn, with gates at 4, 5, 7, 9, 10. External feedback and a check against our own docs found:

1. **Order.** Architecture review (4) came before the PRD (5), so the data model and module choices were fixed before requirements were approved.
2. **Test-first was only partly there.** The PRD template already had Given/When/Then criteria and the spec had a test plan, but nothing required tests to be written, and seen failing, before the code (only bug fixes needed a regression test that failed first).
3. **No release or measure phase.** The pipeline stopped at QA. Staging exists (`environment.md`) but release, rollback, and checking whether the feature met its goal were undefined.
4. **Docs as a late phase** contradicted the Definition of Done, which already required docs per PR. A "boundary audit" phase was not needed: boundaries are enforced by lint.
5. **One weight for every change.** A "Small changes" exception existed but was based only on size and had no middle tier.

## Decision

- Phases: Idea → PRD → Research and spike → Tech spec → Slice plan → Build (loop per slice) → QA → Release → Measure → Learn and close out.
- Gates: PRD, Spec (also approves the slice plan), PR (every slice), Release.
- Tiers S/M/L chosen by **size and risk**, with explicit triggers. Any risk trigger takes a change out of tier S.
- Build loop per slice: tests from acceptance criteria first (logic and bug fixes), automated gates, separate-context review then human review, merge with docs in the same PR.
- Documentation is part of every PR. Architecture review is the Spec gate. Boundary checks stay automatic.

Adjusted from the feedback:
- Feature flags and percentage rollouts are **not** a default. They need infrastructure that is not decided (hosting, decision F). A flag mechanism needs its own ADR. Until then, unfinished features stay unlinked until the last slice.
- Test-first is required for logic and bug fixes, not for layout or config.
- Research is split: light discovery in the idea phase informs the PRD; technical research and the spike come after the PRD.
- Measure records **Unknown** when no analytics exist, instead of claiming success. Analytics tooling is not decided.
- Boundary checks use `eslint-plugin-boundaries` (the feedback assumed dependency-cruiser).

## Consequences

- File names in `specs/<slug>/` changed: `02-prd.md`, `03-research.md`, `04-tech-spec.md`, `05-slices.md`, `07-qa.md`, `08-release.md`, `09-measure.md`, `10-learnings.md` (`06` is the build loop, tracked in PRs and `05-slices.md`).
- Templates `feature-spec.md` and `task-breakdown.md` became `tech-spec.md` and `slices.md`; `release-checklist.md` and `measure.md` were added. Skills `write-prd`, `new-feature`, `code-review`, the Definition of Done, `testing.md`, and the skills table were updated.
- The old "decision M" (gate placement) is resolved by this ADR.
- More human gates per feature (one per slice PR), mitigated by tiering. Release steps are generic until decision F (hosting) is made.
- Not yet exercised on a real feature: expect adjustments after the first one. Use phase 10 for that.

## Amendment (2026-10-26)

Phase 6 now has one artifact: `06-review-log.md` (`templates/review-log.md`), one entry per review round of each slice, appended in that slice's PR. Reason, raised by the owner: a structured, in-repo record makes the PR gate more detailed and auditable than a link or summary in the PR description. It stays per slice, not a batch at the end. The sentence above that says `06` is tracked only in PRs and `05-slices.md` is superseded.

## Alternatives considered

- Keep the 12 phases and only reorder: leaves docs and QA as late phases and gives no release or measure step.
- Adopt the feedback verbatim (flags by default, 5% to 100% rollouts, dependency-cruiser): rejected where it assumes decisions or tools we do not have.
- Size-only tiers: rejected, a one-line auth change is small but risky.

## Verification

Process change; no library APIs involved. Checked against: the previous `sdlc-pipeline.md`, `templates/prd.md`, `environment.md`, `definition-of-done.md`, and the written feedback.
