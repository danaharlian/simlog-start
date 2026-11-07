# 0006 Error model: plain-object errors and `Result`

- Status: accepted
- Date: 2026-10-27
- Deciders: owner (decisions T and U)

## Context

The first error standard was a class hierarchy (`AppError` with subclasses) thrown by services. Two facts make that unsafe in this stack:

- **Verified (serializer level, 2026-10-26):** TanStack Start serializes an error thrown in a server function with `ShallowErrorPlugin`: only `message` crosses the network and the client receives a plain `Error`. A class loses `code`, `details`, and `instanceof`. Plain objects round-trip intact. Run with seroval 1.7.2, `@tanstack/router-core` 1.171.39, `start-client-core` 1.170.39.
- **Verified:** a server function that returns `{ ok: false }` is a success to TanStack Query: no retry, no `onError`, `onSuccess` runs.

The owner also supplied a recommendation (functional style, error factory as plain object with a discriminated union, `Result` for expected failures, throw only at framework boundaries, one boundary that logs with pino). It matches the two facts above, so it is adopted and adapted to the existing layers.

## Decision

1. **Expected failures** are plain `AppError` objects (`kind`, `code`, `message`, plus `fieldErrors` for `validation`) returned in a `Result` (`ok`, `data` / `error`) by the service. Five kinds: `validation`, `unauthorized`, `forbidden`, `not_found`, `conflict`.
2. **Unexpected failures** are thrown. `withErrorBoundary` (server function boundary) logs once with pino and throws one generic `Error`. `redirect()` and `notFound()` pass through (`isRedirect`, `isNotFound`).
3. **Codes** (decision U) live in `src/features/<feature>/errors.ts`: pure constants and types. A new `errors` category in `eslint.boundaries.js` keeps that file free of server, db, and UI imports; other features reach it only through `index.ts`. User-facing text is an exhaustive `Record<Code, string>` in the feature's UI.
4. **No `class` in application code** (decision T), enforced by `ClassDeclaration` and `ClassExpression` selectors in `eslint.no-suppress.js` and by `check-lint-integrity.mjs`. Unions are discriminated by `kind` (errors) or `ok` (`Result`). `instanceof` is only for built-ins and library classes (review rule, not lint).
5. Mutations and forms read `data.ok`; they invalidate caches and show success only when `ok` is true.

## Consequences

- Services and tests assert on a returned value, not on a thrown class.
- Every `kind` added later touches each `switch` on `kind`: adding one needs an ADR.
- The code skeletons in `docs/03-standards/error-handling.md` were type-checked on TypeScript 6.0.3 strict; the lint rules were run with ESLint 10.13, `eslint-plugin-boundaries` 7.2.0, typescript-eslint 8.72 on a fixture project, including negative cases (class declaration and expression, `errors.ts` importing a service or UI, another feature importing `errors.ts`, shared importing a feature, a missing UI message for a new code).
- **Not verified:** behavior in a running Start app (only the serializer was run), the logger module path (`shared/server/logger.ts` is a proposal), how Drizzle (1.0 RC, ADR 0008) exposes PostgreSQL error codes, whether a middleware could host the boundary instead of a wrapper function.
- Updated with this ADR: `error-handling.md`, `typescript.md` (rules 15 to 17), `api-conventions.md`, `tanstack-query.md`, `tanstack-form.md`, `modular-monolith.md`, `folder-structure.md`, `no-suppression.md`, `linting-and-formatting.md`, `templates/tech-spec.md`, skills `add-server-function`, `code-review`, `write-tech-spec`.

## Alternatives considered

- Keep the class hierarchy and rebuild instances on the client: needs a custom serialization adapter in Start; more machinery for the same result.
- Throw plain objects for expected failures: Query would treat them as errors and retry, and the lint rule `only-throw-error` would object.
- Error codes in `shared/`: couples every feature to one list and breaks feature ownership.
- A `domain/` folder for rules and errors: see decision V in ADR 0007.

## Verification

Serializer experiment 2026-10-26 (scratch project with the packages above). `isRedirect` and `isNotFound` exported from `@tanstack/react-router` 1.170.46. TanStack Form `validators.onSubmitAsync` returning `{ form, fields }`: form-core validation guide via Context7, 2026-10-26 (React page not re-read).
