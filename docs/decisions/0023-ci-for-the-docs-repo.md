# 0023 CI for the docs repo

- Status: accepted
- Date: 2026-10-31
- Deciders: owner asked for CI in this repo; the choices below are the agent's and can be reversed by a new ADR
- Extends: ADR 0022

## Context

Nothing ran `check-docs`, `test-check-docs.mjs`, or `test-gates.mjs` automatically, and the run on a real Start app existed only as manual steps. This folder is not yet a git repository, so no workflow can run until it is pushed to GitHub.

## Decision

`.github/workflows/ci.yml` has three jobs, on `ubuntu-latest` with Node 24 and pnpm 12.16.1. It runs on a push to `main`, on a pull request, weekly, and by hand.

| Job | Runs |
|---|---|
| `docs` | `check-docs.mjs`, `test-check-docs.mjs` |
| `gates` | `test-gates.mjs` |
| `real-app` | `scripts/test-real-app.sh`: scaffold, installer, seven gates, `build`, `preview`, second install |

- **The weekly run** exists because the scaffold brings `latest` packages, so `real-app` can break with no commit here. That is a signal to read, not a reason to skip the job.
- **The real-app steps are in a script,** so a person runs what CI runs.
- **Actions are pinned to a full commit SHA,** with the tag in a comment: `actions/checkout` v7.0.1, `actions/setup-node` v7.1.0, `pnpm/action-setup` v6.1.0. The workflow has `contents: read` only, and checkout keeps no credentials. `shadcn` is pinned to 4.23.0, as recorded in `versions.md`.
- **Not added:** CI for apps. The installer does not copy this workflow, and `linting-and-formatting.md` already lists what an app's CI must run.

## Consequences

- **A bug this found:** with `CI=true`, pnpm defaults to a frozen lockfile. The installer replaces `latest` in `package.json`, and its `pnpm install` then failed with no report, because the result was never read. The lockfile stayed stale and the next install failed with `ERR_PNPM_OUTDATED_LOCKFILE`. `install.mjs` now passes `--no-frozen-lockfile` to its own installs and reports a failure. A local install was not affected.
- A pinned SHA does not update itself. Bumping an action is a manual, reviewed change; nothing such as Dependabot was added.
- A failed run blocks a merge only after a human turns on "Require status checks" in branch protection.
- The `real-app` job needs network and takes minutes, and an upstream release can turn it red.

## Not verified

- **The workflow has never run on GitHub,** because this folder has no remote, and neither Docker nor `act` is available here. A first run may fail for a reason not seen locally.
- **`actionlint` was not run.** Downloading its binary was denied by this session's permission settings. The file was parsed as YAML and its jobs and steps were listed, which does not check Actions semantics. Inputs of `actions/setup-node` and `pnpm/action-setup` were read from `action.yml` on their default branches, not at the pinned SHAs; `persist-credentials` was read at the pinned `actions/checkout` SHA.
- **Linux.** All three commands passed on macOS with Node 24.
- That the runner has `curl`, and that `pnpm dlx` behaves the same there.

## Alternatives considered

- **`docs` and `gates` only.** Faster and steadier, but the frozen-lockfile bug above was found only by the real app run under `CI=true`. Rejected.
- **Run `real-app` weekly only, not on a pull request.** A change to the installer could then merge broken. Rejected.
- **Tags in place of SHAs (`@v7`).** Easier to read, but a tag can move. `mcp.md` already asks to pin where the tool allows it. Rejected.
- **Add a matrix of operating systems and Node versions.** More cost with no reported need. A later ADR can add it.

## Verification

Docs consulted (2026-10-31): GitHub releases API for `actions/checkout`, `actions/setup-node`, and `pnpm/action-setup` (tag and commit SHA). `action.yml` of `actions/setup-node` and `pnpm/action-setup`. pnpm 12.16.1: `pnpm install --help`, for `--no-frozen-lockfile` and the CI default.

Run on 2026-10-31 on macOS: `bash scripts/test-real-app.sh` exit 0 with 7 of 7 gates on both installs, `preview` 200, and the port free afterward; `test-gates.mjs` 20 of 20; `test-check-docs.mjs` 75 of 75.
