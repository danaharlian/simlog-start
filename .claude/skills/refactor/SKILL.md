---
name: refactor
description: Change the structure of existing code without changing its behavior, as a tier S change - pin the behavior with tests, move in small steps, prove the tests pass unchanged. Use when asked to refactor, clean up, reorganize, split a large component or file, or extract code. Not when a public API, a table, or a validation rule has to change.
---

# Refactor

Pipeline tier S: issue, one PR, one gate (`docs/01-workflow/sdlc-pipeline.md`, section 1). Read `docs/03-standards/coding-standards.md` and `docs/02-architecture/design-principles.md` (the abstraction gate, complexity limits, when to split a feature). Branch, gates, and PR are those of `build-task` (steps 5 to 7). Commit type: `refactor`.

## Steps

1. **State the reason and the limit** in the issue (`docs/templates/issue.md`): what is wrong now, what the shape will be, and which files change. "Cleaner" is not a reason; "this form is 340 lines and mixes three domains" is. When a smell in `docs/02-architecture/design-principles.md`, "Smells to flag in review", fits, name it and take its remedy. A check-then-write is not a refactor: fixing it changes behavior under concurrency, so it goes to `fix-bug`.
2. **Check the tier.** Stop and go to `run-pipeline` if the change alters a feature's `index.ts` or `index.server.ts`, a server function's shape, an event, a table, a validation rule, or authorization. Moving code between features changes a public API, so it is tier L.
3. **Pin the behavior first.** Run the tests that cover this code and keep the result. If nothing covers it, add tests against current behavior with `add-tests`, in a commit of their own, before moving anything.
4. **Move in small steps,** one kind of change per commit, with the tests passing after each. Do not change tests in the same commit as the code they cover: a test that had to change means behavior changed, so stop and say so.
5. **Use the repo's shapes:**

   | Problem | Move to |
   |---|---|
   | A large form | Orchestrator, sections, and mappers (`docs/04-stack/tanstack-form.md`, "Form structure") |
   | A large component | Smaller ones in the same folder (`docs/03-standards/components.md`) |
   | A rule with several branches inside a service | `server/<name>.rules.ts` (ADR 0013) |
   | Business logic in a route, component, or server function | The feature's service; the UI gets the answer in the DTO |
   | A generic helper repeated in two features | `shared/lib`; a rule with business meaning stays with its owner |
   | A feature holding several capabilities | Stop: splitting a feature is tier L (`design-principles.md`, "When to split a feature") |

6. **No new folder lint does not cover,** and no interface with one implementation (`docs/02-architecture/folder-structure.md`, `design-principles.md`).
7. **Stay in scope.** A bug found along the way gets its own issue and `fix-bug`. Do not fix it in this PR: it changes behavior, and the tests no longer prove the refactor is safe.
8. **Run the gates** and keep the real output. Never get green with a suppression, a cast, or a config edit (`docs/03-standards/no-suppression.md`).

## Output

The issue and PR links, the test result before and after (same tests, same count), which test files changed and why (expected: only new ones), and anything found and left for another issue.
