---
name: prepare-release
description: Fill the release checklist and the rollback plan for a QA-passed feature (pipeline phase 10). Use before deploying a tier M or L feature. Produces 10-release.md for the Release gate. Does not deploy.
---

# Prepare the release

Pipeline phase 10. Output: `specs/<slug>/10-release.md` from `docs/templates/release-checklist.md`. Inputs: `09-qa.md`, the spec's rollout and rollback section (12), the PRD's release expectations and rollback trigger.

## Steps

1. Check the gate inputs: all tasks merged, a passed review round for each, and `09-qa.md` with no blocking item and an overall result of pass or pass with accepted risks. If not, stop and report.
2. List what ships: tasks and PR links, migrations in order, new env vars, the build or commit id.
3. Migrations: `pnpm exec drizzle-kit check` reports no conflict and no warning. Additive first, destructive in a later release. State reversible yes or no, and why no is acceptable. Compare with the spec's migration notes.
4. Env vars: every new name is in `.env.example`, the env schema, and (names only) staging and production secret stores. Never write values (`docs/03-standards/environment.md`). If the release changes auth or upgrades Better Auth: `baseURL` is the public HTTPS origin, `trustedOrigins` holds no `localhost`, and the origin test in `docs/04-stack/better-auth.md`, rule 9, ran on this version. Use the checklist in skill `better-auth-security-best-practices` as a reminder, not as the rule.
5. Write the rollback: the PRD's trigger and accountable owner, how to return to the previous version, what happens to data written since, who decides. Someone other than the author checks it.
6. Deploy steps are platform-specific: the runtime is decided (Node in a container, ADR 0007) but the platform steps are not written yet, so leave `TODO(verify)` and ask. Never paste deploy commands from memory.
7. List the smoke test (3 to 5 checks) and the post-release monitoring window. Schedule the measure phase from the PRD's window and review date.
8. You prepare; a human at the Release gate approves and deploys. Set the status to `in review` when ready, and leave "Approved by" empty; `approved` follows the approval rule (`docs/01-workflow/sdlc-pipeline.md`, section 4).

## Output
The file path, open blockers, and the items a human must supply (deploy steps, rollback owner).
