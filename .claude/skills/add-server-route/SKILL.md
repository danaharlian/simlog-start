---
name: add-server-route
description: Add a server route with its own HTTP address for a caller outside our UI (webhook, cron, public or partner API, file upload), with its own authentication, CSRF decision, validation, response helpers, and tests. Use when something external needs a URL. Calls from our own UI use add-server-function instead.
---

# Add a server route

Read `docs/03-standards/api-conventions.md` ("Choosing the mechanism", server route rules, response shape, status codes, helpers), `docs/02-architecture/data-fetching.md`, and `docs/03-standards/security.md`. Run `verify-library-docs` for the Start server route API. A new external integration is tier L, and a public endpoint is a contract others rely on: check the tier first (`docs/01-workflow/sdlc-pipeline.md`). The auth handler at `src/routes/api/auth/$.ts` is not built with these steps: it only forwards, and Better Auth protects it (`docs/04-stack/better-auth.md`, rules 3 and 9).

## Steps

1. **Confirm it needs a URL.** If our own UI is the only caller, stop and use `add-server-function`: a route adds its own CSRF setup and loses typed input and output.
2. **Place it** under `src/routes/api/**`; a public API is versioned (`/api/v1/...`). Export only the methods it supports, and put no UI in the file.
3. **Decide authentication, in writing.** No function middleware runs here unless you call a server function, so the route answers for itself (ADR 0012):

   | Caller | Authentication | CSRF middleware | Reaches the feature through |
   |---|---|---|---|
   | Webhook | Signature over the raw body, checked before parsing | No | A service from `index.server.ts` |
   | Cron or trigger | Secret from env | No | A service from `index.server.ts` |
   | Public or partner API | Token, plus a rate limit | No | A service from `index.server.ts` |
   | Our logged-in UI (uploads only) | Session, through the server function | Yes | A server function from `index.ts` |

4. **A webhook** passes `await request.text()` and the signature header to one service function. That function verifies the signature, parses with Zod (malformed JSON must not become a 500), rejects duplicates by event id, saves in a transaction, and only then returns success.
5. **Validate** query and body with `safeParse`; query strings need `z.coerce` (`docs/04-stack/zod.md`). Sort and filter inputs are allow-lists; lists are paginated.
6. **Answer with the helpers:** run inside `withRouteBoundary` and respond through `resultResponse`, `errorResponse`, or `invalidInputResponse`. No per-endpoint shape. The first route creates `shared/server/http-response.ts`.
7. **Env and docs.** A new secret goes in `.env.example` and the env schema (`docs/03-standards/environment.md`). Document the endpoint in the feature's `README.md`.
8. **Tests** (`docs/03-standards/testing.md`, rule 6): valid input, invalid input, unauthenticated, unauthorized, not found, asserting the status and JSON shape; a webhook also has a bad signature and a duplicate delivery. The built server's `fetch` handler can be called with a `Request`.
9. **Run the gates.** Boundary lint decides what the route may import (`docs/03-standards/linting-and-formatting.md`); fix a violation structurally.

## Checklist

- [ ] Each request is authenticated, or the endpoint is public on purpose and says so in the `README.md`
- [ ] A failed signature check happens before any parsing or write
- [ ] A thrown error shows the generic 500 and its detail is only in the log
- [ ] Nothing imports feature internals

## Output

The route file and URL, the authentication and CSRF decision, the statuses it returns, gate results, and `Docs consulted:`.
