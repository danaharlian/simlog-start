# Logging

**When to read:** when writing a log line, creating or changing the logger, or deciding what may appear in logs. Which failures get logged, and where: `error-handling.md`.

Tool: **pino** on the server. Checked on 2026-10-31 with pino 10.4.0 and a production build of Start 1.169.4 (ADR 0015).

## Where each runtime logs

| Code | Runtime | Log with |
|---|---|---|
| `*.service.ts`, `*.repository.ts`, `*.listeners.ts`, server function handlers, server routes | Server | `logger` |
| `withErrorBoundary`, `withRouteBoundary` | Server | `logger`: the one place an unexpected failure is logged |
| Components and hooks | Browser, and the server during SSR | Normally nothing: failures reach `errorComponent` or the UI through a `Result` |
| A route's `errorComponent` | Browser, and the server during SSR | `console.error` is acceptable; never put private data in it |

**Code is isomorphic here** (`docs/04-stack/tanstack-start.md`), so "client component" is not a safe label for `console.*`. Server code does not use `console.*`. Lint rejects it under `features/*/server/`, `shared/server/`, `routes/api/`, and in `*.server.ts(x)` files (`eslint.code-rules.js`, ADR 0021, ADR 0022). Elsewhere the same file may run on both sides, so review checks it.

Client logs are not removed from production builds, because no build step for that is set up. Do not write a client log you would not want a user to read.

## The logger

```ts
// shared/server/logger.server.ts
import pino from 'pino'
import { serverEnv } from '@/shared/config/env.server'

export const logger = pino({
  level: serverEnv.LOG_LEVEL,
  redact: {
    paths: [
      'password',
      'token',
      'authorization',
      'cookie',
      'email',
      '*.password',
      '*.token',
      '*.authorization',
      '*.cookie',
      '*.email',
    ],
    censor: '[REDACTED]',
  },
})
```

The `.server.` name keeps it out of the client build. Imported through `withErrorBoundary` by a server function that the UI calls, it left neither `pino` nor `redact` in `dist/client` (observed).

Output is JSON. `pino-pretty` for development is not installed, because a new dependency needs an ADR.

## Redaction is a net, not a permission

Observed with the configuration above:

| Logged | Result |
|---|---|
| `{ email }`, `{ user: { email } }`, `{ headers: { authorization } }` | Redacted |
| `{ deep: { user: { email } } }` | **Written in clear:** `*` covers one level only |
| `{ users: [{ email }] }` | **Written in clear:** arrays are not covered |
| `logger.info('sent to a@b.c')` | **Written in clear:** the message is not inspected |

So the rule stays: **log ids, not personal data.** Never pass a whole row, request, or DTO to the logger.

## Levels

| Level | Use for | Example |
|---|---|---|
| `error` | An unexpected failure that needs attention | Database unreachable |
| `warn` | Degraded, but still working | Falling back after a provider timeout |
| `info` | A significant event | Payment captured, migration applied |
| `debug` | Development detail, off in production | A computed value |

An expected failure returned as a `Result` is a normal outcome, **not** an `error` (`error-handling.md`).

## Rules

1. **Structured, with context:** `logger.error({ operation, userId, err }, 'unexpected failure')`. The message is a fixed string; values go in the object.
2. **A caught error goes under `err`.** Only that key has pino's error serializer. Under `cause` or `error`, a plain error logs as `{}`, and a database error writes the driver's `detail`, which can hold the rejected value (ADR 0014).
3. **Log once.** An error is logged where it is handled, not at every layer it passes through.
4. **Include what ties lines together:** `requestId`, `userId` (id only), `operation`.
5. **Never log** passwords, tokens, cookies, session ids, full personal data, or request bodies. Data classes: `security.md`.
6. **Audit events** (login, permission change, data export) are `info` lines with an actor id and a target id (`security.md`, rule 13).

```ts
// Wrong: unstructured, personal data in the message, loses the stack
logger.error(`Failed for ${user.email}: ${String(error)}`)

// Right
logger.error({ operation: 'invoices.create', userId: user.id, err: error }, 'unexpected failure')
```
