---
name: add-tests
description: Add tests to existing code with no behavior change, as a tier S change - choose by priority, test behavior at the right level, and report real results. Use when asked to write tests, raise coverage, or pin behavior before a refactor. Tests for new behavior are written first inside build-task, and a bug's regression test belongs to fix-bug.
---

# Add tests

Read `docs/03-standards/testing.md`; its rules are not repeated here. Run `verify-library-docs` for any test library API you have not seen this session. Testing Library, a DOM environment, and Playwright are not installed until the first test that needs them (`docs/04-stack/versions.md`, action item 4): if one is missing, say so and ask.

## Steps

1. **Choose what to test** by the priority order in `testing.md`: business rules, Zod schemas, authorization and server functions, form mappers and pure helpers, component behavior, end-to-end flows. Skip what that page lists under "What not to test".
2. **Choose the level.** Pure logic: unit. Persistence: integration against real PostgreSQL. UI behavior: component. A critical journey: end-to-end. Mock only boundaries you do not own.
3. **Place the file** per the table in `testing.md`. A test does not go beside a component: the boundary rules would treat it as UI.
4. **Write one behavior per test,** with a name that states it (`rejects payment when invoice is already paid`), covering failure paths as well as the happy path. A server function also gets invalid input, unauthenticated, unauthorized, and not found.
5. **Prove each test can fail.** A test on existing code usually passes at once, which proves little. Break the code briefly, or change an expected value, and see it fail for the right reason; then restore it. Do not call this test-first.
6. **A test that exposes a bug:** do not change the assertion to match the bug, and do not fix it here. Open an issue for `fix-bug` and report it. Never commit `.skip` or `.only` (`docs/03-standards/no-suppression.md`).
7. **Run the gates,** including `test`, and keep the real output. Coverage is a smoke alarm: no assertion-free tests to reach a number.

## Output

The files added, the behavior each covers, how each was shown able to fail, commands run with results, and any bugs found (issue links).
