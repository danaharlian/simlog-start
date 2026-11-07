# Cross-Feature Communication

**When to read:** before one feature uses another, before adding or changing an event, and when writing the "Public API", "Cross-feature consumption", or "Events" tables of a feature spec. Decided in [ADR 0009](../decisions/0009-cross-feature-communication.md), which also lists what was checked and what was not.

A feature is a boundary. Calling another feature is allowed; reaching into its internals is not. There are two doors, and they differ in where they may be used.

## The two public entry points

| File | Contains | Who may import it |
|---|---|---|
| `features/<f>/index.ts` | **Client-safe**: components, query options, types, schemas, error codes and types, event definitions, server function wrappers (`*.functions.ts`) | routes, other features, tests |
| `features/<f>/index.server.ts` | **Server-only**: service functions other features may call, `register<Feature>Listeners` | only `*.functions.ts`, `*.service.ts`, and `*.listeners.ts` files of another feature, server routes under `src/routes/api/**` (ADR 0012), and `src/subscribers.server.ts` |

Why two: Start code is isomorphic. A server function in a barrel that also exports a plain service function is **not** protected: when client code uses that export, the build succeeds with one warning and the server code ships to the browser (checked, ADR 0009). Files named `*.server.*` are denied in the client build, so a client import of `index.server.ts` fails the build, and lint rejects it earlier (category `public-server`, `docs/examples/eslint.boundaries.js`).

Never export a service function from `index.ts`. Never re-export an `index.server.ts` symbol from `index.ts`.

| Export through a public entry point | Never export |
|---|---|
| Stable DTO types and schemas other code needs | Drizzle tables or row types |
| Query options, the query scope, components, server function wrappers (`index.ts`) | Repositories and internal helpers |
| Service functions other features call (`index.server.ts`) | Anything "just in case": export what a consumer needs today |
| Error codes, event definitions (`index.ts`) | |

Consumers are recorded in the feature spec's cross-feature table, not in code comments.

## Which mechanism

| Situation | Use |
|---|---|
| A needs B's data to show or to decide | B's public API: query options (client-safe) or a service function from `index.server.ts` |
| A changes B's data and both must succeed or fail together | B's service function from `index.server.ts`, inside **one transaction**: it takes `DbOrTx` as its first argument (`docs/04-stack/drizzle-postgres.md`, "Transactions") |
| Something happened in A; other features may react; their failure must not fail A (notify, audit trail, update a summary) | **Typed in-process event** (default for reactions) |
| A reaction must not be lost, must survive a restart, or must reach another instance (payment, external integration, mandatory audit) | **Durable event**: not implemented; needs its own ADR first (ADR 0009, decision 5) |
| Two features need each other | Cycles are forbidden: extract the shared concept into a third feature or `shared`, or turn one direction into an event |

Reads never go through events: an event returns nothing. A's own query that returns B's data, joined on the server, declares `meta: { dependsOn: [<B's scope>] }`, so B's mutations refresh it (`docs/04-stack/tanstack-query.md`, rule 12; ADR 0035).

## Events

An event is a name plus a Zod schema for its payload. The **owning** feature defines it; other features import the definition from its `index.ts` and subscribe.

```ts
// shared/events/define-event.ts  (client-safe; generic, knows no feature)
import type { z } from 'zod'

export type EventDef<TSchema extends z.ZodType> = {
  readonly name: string
  readonly schema: TSchema
}

export function defineEvent<TSchema extends z.ZodType>(
  name: string,
  schema: TSchema
): EventDef<TSchema> {
  return { name, schema }
}
```

```ts
// shared/events/bus.server.ts  (server-only; best-effort, in-process)
import type { z } from 'zod'
import { logger } from '@/shared/server/logger.server'
import type { EventDef } from './define-event'

type Delivery = (payload: unknown) => Promise<void>

const subscribers = new Map<string, Array<Delivery>>()

export function subscribe<TSchema extends z.ZodType>(
  event: EventDef<TSchema>,
  handler: (payload: z.infer<TSchema>) => void | Promise<void>
): void {
  const delivery: Delivery = async (raw) => {
    const parsed = event.schema.safeParse(raw)
    if (!parsed.success) {
      logger.error({ event: event.name }, 'event payload failed its schema')
      return
    }
    await handler(parsed.data)
  }
  subscribers.set(event.name, [...(subscribers.get(event.name) ?? []), delivery])
}

export async function publish<TSchema extends z.ZodType>(
  event: EventDef<TSchema>,
  payload: z.infer<TSchema>
): Promise<void> {
  for (const deliver of subscribers.get(event.name) ?? []) {
    try {
      await deliver(payload)
    } catch (error) {
      logger.error({ event: event.name, err: error }, 'event handler failed')
    }
  }
}
```

```ts
// features/orders/events.ts  (pure; exported from features/orders/index.ts)
import { z } from 'zod'
import { defineEvent } from '@/shared/events/define-event'

export const orderPaid = defineEvent('orders.paid', z.object({ orderId: z.string() }))
```

```ts
// features/orders/server/orders.service.ts  (publishes after the change is saved)
import { publish } from '@/shared/events/bus.server'
import { orderPaid } from '../events'
// ... inside the service function, after the write succeeded:
await publish(orderPaid, { orderId })
```

```ts
// features/notifications/server/notifications.listeners.ts  (subscribes; calls its own service)
import { orderPaid } from '@/features/orders'
import { subscribe } from '@/shared/events/bus.server'
import { notifyOrderPaid } from './notifications.service'

export function registerNotificationsListeners(): void {
  subscribe(orderPaid, (payload) => notifyOrderPaid(payload.orderId))
}

// features/notifications/index.server.ts
export { registerNotificationsListeners } from './server/notifications.listeners'
```

```ts
// src/subscribers.server.ts  (the one composition root; imports every feature that listens)
import { registerNotificationsListeners } from '@/features/notifications/index.server'

let registered = false
export function registerAllSubscribers(): void {
  if (registered) return
  registered = true
  registerNotificationsListeners()
}
```

```ts
// src/start.ts  (started once per process by a request middleware; CSRF is NOT automatic once this file exists)
import { createCsrfMiddleware, createMiddleware, createStart } from '@tanstack/react-start'

const csrf = createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === 'serverFn' })

const subscribers = createMiddleware().server(async ({ next }) => {
  const { registerAllSubscribers } = await import('./subscribers.server')
  registerAllSubscribers()
  return next()
})

export const startInstance = createStart(() => ({
  requestMiddleware: [csrf, subscribers], // removing csrf still builds, and leaves server functions open
}))
```

These shapes were compile-tested (TypeScript 6.0.3 strict, zero casts), lint-tested against the boundary config, and the registration was run against the built server (ADR 0009). The orders and notifications names above are illustrative.

### Rules for events

1. **Names:** `<feature>.<past-tense-fact>` (`orders.paid`). An event states something that happened; it is not a command.
2. **The owner defines, others import.** An event definition lives in the owner's `events.ts` (category `events`: pure, no server, db, or UI imports) and is exported from `index.ts`. There is **no central event map** in `shared`: `shared` never learns about features.
3. **Payload:** small, serializable, ids and facts rather than rows or DTOs of another feature. **Never secrets or personal data:** publish an opaque id, and let the handler read what it is authorized to read through the owner's public API. Validated by the bus with the Zod schema; a payload that fails is logged and not delivered.
4. **Publish after the change is saved.** In-process events are not rolled back with a transaction. A handler that must see the committed data runs after the commit.
5. **Handlers are best-effort.** A handler that throws is logged once and does not fail the publisher. A handler that must not fail silently is a sign the reaction needs the durable path or a direct call.
6. **A listener is transport:** like a server function, it calls its own feature's service and nothing else (lint: no repository, db, or UI from a listener).
7. **Idempotent handlers.** Assume a handler can run more than once once the durable path exists; write it that way now.
8. **Document every event** in the owner's `README.md` (name, payload, when it fires) and in the feature spec's Events table, with its delivery class.
9. **No bus library, no central registry, no `class`.** Introducing a bus library needs an ADR.
10. **Tests:** a service test asserts the event was published; a listener test calls the handler with a valid payload and asserts the effect and that a failing dependency does not throw out of `publish`.

## Durable events: what the future ADR must cover

Nothing here is implemented. ADR 0009 sets when to move to durable; when that happens, the ADR must cover at least:

- **Same transaction:** the state change and an outbox row commit together.
- **Row fields:** unique event id, name, schema version, payload, occurred-at, correlation id, delivery status, attempt count, last failure.
- **Dispatcher:** a server-side process with bounded retries and back-off.
- **Consumers:** deduplicate by event id.
- **Failures:** exhausted rows go to a queue an operator can see.
- **Operations:** metrics and alerts for backlog, retries, and failures.

## Not covered yet

Durable events and the outbox (above), behavior in the dev server with hot reload (guard the registration before relying on it), and several container instances (in-process events reach one instance).
