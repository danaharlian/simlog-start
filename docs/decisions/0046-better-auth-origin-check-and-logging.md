# 0046 Better Auth hardening: origin check under tests, CSRF on username sign-in, and its logger

- Status: proposed
- Date: 2026-11-08
- Deciders: pending. Point 1 was asked for at the PR gate of `specs/auth` T1 (Dana Harliansyah, Tech Lead, via chat, 2026-11-08: "PR #2 approve with notes: … tes Origin otomatis + ADR 0046 di T2 …"). Points 2 and 3 were found while building T2. The whole ADR is decided at the T2 PR gate.
- Amends: `docs/04-stack/better-auth.md` rule 9 ("Never set `advanced.disableOriginCheck`")

## Context

All three facts below were read in the installed `better-auth` 1.7.18 source and observed in `specs/auth` T1 and T2 against PostgreSQL.

1. **The origin check is off under tests.**
   - `context/create-context.mjs` sets `skipOriginCheck` to `true` when `isTest()` is true (`NODE_ENV === "test"`), unless `advanced.disableOriginCheck` is set. Vitest sets `NODE_ENV=test`.
   - Under Vitest, a sign-up from `https://evil.example` therefore returned 200.
   - On the dev server the check was on: a foreign `Origin` got 403, a cross-site navigation 403, and the same origin 200.
   - `better-auth.md` rule 9 asks for this table to be kept as an integration test, which cannot pass under these defaults.
2. **`/sign-in/username` has no CSRF middleware.**
   - `api/routes/sign-in.mjs` runs `use: [formCsrfMiddleware]` on `/sign-in/email`. The username plugin's `/sign-in/username` (`plugins/username/index.mjs`) does not.
   - With the origin check on, a sign-in on the username path from a foreign `Origin` still returned 200, while the email path returned 403.
   - `formCsrfMiddleware` is exported from `better-auth/api`.
3. **Better Auth's logger writes personal data.**
   - On a unique-violation race at sign-up, Better Auth logs "Failed to create user" and passes the `DrizzleQueryError` as an extra argument. Its `detail` held `Key (email)=(…@contoh.id) already exists.`
   - `logging.md` and `security.md` rule 13 forbid personal data in logs.
   - Below `warn`, some messages hold the email in the text itself: `api/routes/sign-up.mjs` logs ``Sign-up attempt for existing email: ${email}`` at `info`. Better Auth's own logger level defaults to `warn` (`@better-auth/core` `env/logger.mjs`), which filters it today.
   - The `logger.log(level, message, ...args)` option (`@better-auth/core` `env/logger.d.mts`) receives every log call.

## Decision

1. **Set `advanced.disableOriginCheck: false` explicitly, and never `true`.** It is the production default stated out loud, so tests run with the same check as production. Rule 9 now reads: never set `disableCSRFCheck`, and set `disableOriginCheck` only to `false`.
2. **Run `formCsrfMiddleware` on `/sign-in/username`** from our `hooks.before` (`features/auth/server/auth.repository.ts`). We reuse Better Auth's own middleware and write no origin logic of our own (`better-auth.md` rule 8). Remove it once a Better Auth release adds the middleware to that endpoint. On each upgrade, read `plugins/username/index.mjs` for `use: [formCsrfMiddleware]` on `/sign-in/username`: the 403 test cannot show this, because it passes either way.
3. **Route Better Auth's logs to pino with the level and message only, and keep Better Auth's level at `warn` explicitly.** The extra arguments, where the driver error and its `detail` travel, are dropped. Messages below `warn` can hold an email in the text, so the level is set, not left to the default. A failure that needs the error object is logged by our own code, which logs ids and never personal data.

## Consequences

- Tests in `features/auth/__tests__/sign-in.test.ts` cover the rule 9 table:
  - sign-up: foreign `Origin`, `Origin: null`, and cross-site navigation get 403; the same origin gets 200;
  - sign-in on the username and email paths: a foreign `Origin`, `Origin: null`, and cross-site navigation get 403; the same origin gets 200;
  - sign-out with a cookie: a foreign `Origin` or no `Origin` gets 403.
- Any test that sends a cookie must also send the app's `Origin`, as a browser does.
- Better Auth's internal error details no longer reach the log. Debugging such a failure needs a local reproduction.
- Follow-up on each Better Auth upgrade:
  - check whether `/sign-in/username` gained `formCsrfMiddleware`;
  - check whether the logger still passes errors as extra arguments;
  - check whether any message at `warn` or above now embeds personal data.
- `sign-in.test.ts` spies on the pino logger, which writes to fd 1 and not through `console`, and checks that an extra argument holding an email never reaches it. A mutation that forwards the arguments makes that test fail (checked 2026-11-08).

## Not verified

- A real browser cross-site form post against the deployed route; only `auth.handler` and `curl` against the dev server were run.
- Whether other plugin endpoints lack the middleware. Only the plugins this app uses were read.

## Alternatives considered

- **Keep the `curl` check on the dev server only.** It would not catch a regression on an upgrade, which rule 9 asks for.
- **Build a separate test instance with `disableOriginCheck: false`.** It would test a configuration production does not run, and still needs the exception to rule 9.
- **Write our own origin check for `/sign-in/username`.** It would duplicate Better Auth's logic, against rule 8.
- **Disable Better Auth's logger.** It would also lose the messages that carry no personal data.

## Verification

`better-auth@1.7.18` installed dist: `context/create-context.mjs`, `api/middlewares/origin-check.mjs`, `api/routes/sign-in.mjs`, `plugins/username/index.mjs`, `api/index.mjs` exports. `@better-auth/core@1.7.18`: `env/env-impl.mjs` (`isTest`), `env/logger.d.mts`. Tests run 2026-11-08 against the test database; `curl` against the dev server, 2026-11-08.
