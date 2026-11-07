# QA: <Feature name>

- Slug: `<feature-slug>` (file `09-qa.md`)
- PRD: `04-prd.md` · Feature Spec: `06-feature-spec.md` (test strategy, section 11) · Tasks: `07-tasks.md`
- Status: draft | done | dropped
- Decided by: <name> (QA Lead), <date>; <name> (Product Owner), <date> — format and authority: `docs/01-workflow/roles.md`
- Gate: none (the Release gate reads this file)
- Result: pending | pass | fail
- Tier: M | L (tier S has no QA file; its PR carries the evidence)
- Tested by: <human, or "AI agent" with the human who reviewed the evidence>
- Date: YYYY-MM-DD
- Environment: staging · build or commit id <…> · data: seeded or factory data, never production data (`docs/03-standards/testing.md`)

QA runs after every task has passed its PR gate (`08-review-log.md`). It checks the **assembled feature** against the PRD, on staging, where the unit and integration tests of the execution loop cannot reach. It does not re-list every test: the feature spec maps each acceptance criterion to a test, and this file records the **result per criterion**, with evidence. QA is not a gate; the **Release gate** reads this file.

Every result is **pass**, **fail**, or **not run** (with the reason). "Pass" without evidence counts as "not run". Tier M minimum: sections 1, 2, 3, 4, 8. Write "n/a" in the rest. Tier L: all sections.

## 1. Checks required for this feature
Start from the tier and the risk triggers in `docs/01-workflow/sdlc-pipeline.md`; add what the PRD's NFRs ask for.

| Check | Required when | Required here? (yes / no, why) |
|---|---|---|
| Acceptance criteria and edge cases walked (sections 2 and 3) | always | yes |
| Zero deprecated API usage and zero deprecation warnings (section 2) | always | yes |
| Concurrency and race conditions against a real database (section 7) | the feature spec, section 4, "Transactions and concurrency", names a collision point (anything but "None") | |
| Regression of existing journeys (section 5) | PRD section 11 lists journeys | |
| Permission matrix (section 4) | auth, permissions, or sessions trigger, or the PRD lists roles | |
| Accessibility (section 6) | the feature has UI | |
| Performance against NFRs (section 7) | performance-sensitive trigger, or a performance NFR | |
| End-to-end in a real browser | a critical flow (`docs/03-standards/testing.md`, rule 10) | |
| Migration behavior verified on staging data | a migration or backfill trigger | |

## 2. Automated results
Commands actually run against this build, with their result (`docs/03-standards/testing.md`, "Reporting"). "Not run" is a valid entry.

| Command | Total · pass · fail · skip | Result | Note |
|---|---|---|---|
| `test` | | | |
| End-to-end suite (if any) | | | |
| `build` | n/a | | |
| `lint` (includes `@typescript-eslint/no-deprecated`) | n/a | | |
| Deprecation warnings in the `test` and `build` output, the staging server log, and the browser console during the walks | count: | | |
| Services coverage (smoke alarm, default ≥ 80% lines) | n/a | | |

Any skip needs its reason here: a skipped test in the code is a suppression (`docs/03-standards/no-suppression.md`).

**Zero deprecation.** `lint` catches a call to an API marked `@deprecated` in the installed types. It cannot see a warning a library prints at run time, so read the outputs in the row above. The count must be 0; each warning is a High defect in section 8 (a deprecated API is removed in a later version), with the library, its installed version, and the replacement from its docs.

## 3. Acceptance criteria and edge cases
One row per AC and per EC in the PRD. "Verified by" says where the result comes from: an automated test (name), or a manual walk on staging.

| ID (AC / EC) | Verified by (test name · manual on staging) | Result | Evidence (command output, link, screenshot) |
|---|---|---|---|

## 4. Permission matrix
From the PRD's roles and permissions. Test each "can" and each "cannot" on staging with a real account per role, including signed out and another tenant's data. A "cannot" must be refused by the server function, not only hidden in the UI.

| Role | Action or data | Expected (allowed · refused with 401 / 403 / not found) | Actual | Result |
|---|---|---|---|---|

## 5. Regression
The journeys the PRD (section 11) says must keep working, and backward compatibility.

| Journey (from the PRD) | Expected unchanged behavior | Result | Evidence |
|---|---|---|---|

Migration and backward compatibility checked on staging: <what, result, or "n/a">.

## 6. Accessibility, responsive, and theme
Target: the accessibility NFR in the PRD (each PRD sets its own level; the repo has no default, ADR 0007 decision W). Tools used: <names and versions, or "manual only">.

| Check | Result | Evidence |
|---|---|---|
| Keyboard only: every action reachable, visible focus, no trap | | |
| Screen reader: labels, names, errors announced (`docs/04-stack/tanstack-form.md` rule 5) | | |
| Contrast and focus styles meet the NFR | | |
| Loading, empty, and error states appear and read clearly | | |
| Mobile, tablet, and desktop widths | | |
| Light and dark theme (`docs/04-stack/tailwind-shadcn.md`, rule 7) | | |

## 7. Performance, concurrency, and security checks
| Item | Target (PRD NFR id) | How measured (tool, conditions, data volume) | Actual | Result |
|---|---|---|---|---|

Security checks beyond the permission matrix: required headers present on staging (`docs/03-standards/security.md`, rule 9); no secrets or personal data in the client bundle, responses, or browser console (`docs/03-standards/environment.md`, rules 3 and 4). Results: <…>. If no tool or budget exists for a metric, write **Unknown** (decision X in `docs/decisions/README.md`); do not invent a number.

### Concurrency and race conditions
One row per collision point in the feature spec, section 4, "Transactions and concurrency" (a status change, a counter, a double submit, a retry). Required in tier M too when section 1 says yes. Start the colliding operations at the same time against a real PostgreSQL database: an integration test that runs them together, or two sessions on staging. A mock cannot show a race. Check the stored data afterward, not only the responses.

| Collision (feature spec, section 4) | Mechanism (constraint · condition in the write · `version` · `FOR UPDATE` · `FOR SHARE` · idempotency key) | How run (test name, or sessions and steps on staging) | Expected (one write wins, the other gets which error; final stored state) | Actual | Result |
|---|---|---|---|---|---|
## 8. Defects
Severity: **Critical** (data loss, including a lost update, duplicate row, or partial write from a race; security, auth bypass, crash of a main flow) · **High** (a Must acceptance criterion fails, no workaround, or a deprecated API or deprecation warning from section 2) · **Medium** (workaround exists) · **Low** (cosmetic). **Blocking for release:** any open Critical or High, or any failed Must criterion. Medium and Low may be accepted with a named human and a ticket.

| ID | Description | Severity | Steps to reproduce | AC or EC | Task / PR | Status (open · fixed in PR · accepted by <name>, ticket) |
|---|---|---|---|---|---|---|

A fix is re-tested here and, for logic, gets a regression test (`docs/03-standards/testing.md`, rule 5). A failed QA runs fix tasks (`docs/01-workflow/sdlc-pipeline.md`, section 4); each re-test adds a row, and earlier results stay:

| Round | Date | Fix tasks and PRs | Criteria and journeys re-run | Result |
|---|---|---|---|---|

## 9. Exploratory notes and acceptance
Anything tried outside the criteria, and what it found. Product owner acceptance (UAT) when the PRD asks for it: <name, date, result>.

## 10. Result for the Release gate
- Overall: **pass** | **pass with accepted risks** (list each, with owner; the header line says `Result: pass`) | **fail**
- Blocking items open: <none, or ids>
- Criteria not run, and why: <none, or ids>
- Recorded by: <name>. Accepted at the Release gate by: <name, date>.
