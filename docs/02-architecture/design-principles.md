# Design Principles (SOLID in this repo)

**When to read:** before adding an abstraction (interface, factory, base class, plugin point), designing a new service or module, or reviewing structure.

SOLID is a set of heuristics for lowering the cost of change, not laws. Here each principle is tied to a concrete rule of this repo and labelled by how it is checked. Where a principle can only be judged by a human, this page says so.

## The gate for any abstraction

Create an interface, base class, strategy, or plugin point only when **at least two real uses exist today**, or when you deliberately choose a test seam and say so in the PR. A single implementation stays a concrete module. "We might need another one later" is not a reason. Three similar lines are cheaper than a wrong abstraction; extract on the third repetition, once the shape is visible. What to do when two **features** repeat code: `docs/03-standards/coding-standards.md`.

## S: Single Responsibility

A unit has **one reason to change**: one stakeholder or one kind of change. It does not mean "a function does one thing".

Our layers exist so that things that change for different reasons live apart:

| Unit | Changes when… |
|---|---|
| Component | the UX changes |
| `queries.ts` (query options) | caching or fetching policy changes |
| `*.functions.ts` | the API contract or auth requirement changes |
| `*.service.ts` | a business workflow or transaction changes, or a small rule |
| `*.rules.ts` (optional) | a non-trivial business rule changes |
| `*.repository.ts` | the schema or query strategy changes |
| `schemas.ts` | the data contract changes |

```ts
// Wrong: one unit with four reasons to change (fetching, validation, rendering, analytics).
function OrderPage() { /* fetch + parse + render + track */ }

// Right: each concern changes alone.
//   queries.ts      orderQueryOptions(id)
//   schemas.ts      orderSchema
//   components/     <OrderView order={order} />
//   server/         order.service.ts decides what "viewed" means for analytics
```

Checked by: lint for the layer boundaries (UI, function, service, repository cannot reach past each other). **Review** for "does this service now serve two stakeholders?" (a service named for two capabilities, or one that needs two unrelated sets of mocks).

## O: Open/Closed

Add behavior by adding code, not by editing code that already works.

- **Open sets** (payment methods, notification channels): a lookup keyed by the union, so a new member is one new entry and the compiler tells you what is missing.
- **Closed sets**: an exhaustive `switch` with a `never` check (`typescript.md` rule 6). Both forms are fine; the failure is a non-exhaustive branch or a `default` that swallows new members.
- **New capability = new feature folder**, not edits spread across existing features.

```ts
const providers = { card, ewallet, qris } satisfies Record<PaymentMethod, PaymentProvider>
providers[method].charge(amount)
```

Checked by: the compiler, for an exhaustive `Record` and a `never` check; lint, for a `switch` on a union (`switch-exhaustiveness-check`, where a catch-all `default` does not count; ADR 0021). Everything else: review.

## L: Liskov Substitution

Anything that stands in for a contract must honor it: no stronger preconditions, no weaker guarantees, same error behavior. Applies to implementations of an interface, wrappers around components, and API responses, not only to inheritance.

- Do not create a subtype whose method throws "not supported". Split the contract (`Reader` and `Writer`) instead.
- A component that wraps another forwards its props and ref semantics.
- A test double must behave like the real thing. This is why persistence tests use a **real database** (`testing.md`): fakes drift from reality.

Checked by: the type system for signatures only. Behavior: tests and **review**.

## I: Interface Segregation

Depend on what you use.

- Props: pass the fields a component needs (`name`, `avatarUrl`), not a whole row or DTO with dozens of fields.
- Feature `index.ts` exports only what other features need.
- Service functions take the arguments they use, not a god object.
- DTOs, not Drizzle rows, cross the network boundary.

Checked by: lint enforces **only encapsulation** (imports of another feature go through `index.ts`, or `index.server.ts` from server code). It cannot tell whether an interface or props type is too wide. That is **review**.

## D: Dependency Inversion

High-level rules do not depend on low-level details. In this repo the mechanism is the **dependency direction**, enforced by lint:

- `routes → features → shared`; inside a feature `UI → function → service → repository → db`.
- A service holds business rules and does not know HTTP, React, or the feature's tables. It reaches data only through repositories (it may use the shared db client for transactions).
- We do **not** wrap every repository in an interface. There is one implementation and tests use the real database, so an interface would be ceremony (see the gate above).

Where inversion is warranted: an external capability with a real second use or a deliberate test seam (email, payments, file storage, a third-party API). Define the interface where it is consumed (the service side), inject the implementation as a parameter, and keep the vendor SDK out of services. File naming and placement for such adapters is not decided yet (decision S in `docs/decisions/README.md`); until then, ask.

Checked by: lint (**verified** on a fixture project: UI → service/repository/db, function → repository/db/UI, service → UI/db/function, repository → service/function are all errors; `import type` and dynamic imports included). Whether an external dependency should have been inverted: **review**.

## Summary

| Principle | Repo rule | Checked by |
|---|---|---|
| SRP | Layers; one reason to change per unit | Lint (layers) + review |
| OCP | Keyed lookups, exhaustive `never`, new feature = new folder | Compiler + review |
| LSP | Honor contracts; real DB in persistence tests | Types (signatures) + tests + review |
| ISP | Narrow props, minimal `index.ts`, DTOs not rows | Lint (encapsulation only) + review |
| DIP | Dependency direction; no interface without two uses | Lint + review |

## Complexity limits

The first four rows are **lint errors** in `src/` (`eslint.code-rules.js`, ADR 0034): lines count code only, not blank lines or comments. Tests (`__tests__/`, `*.test.ts(x)`) and generated shadcn primitives in `shared/ui` are exempt; an `app-*` file there is ours and is checked. There is no inline exception (`no-suppression.md`): split the code. The last two rows are guidelines that **review** checks.

| Metric | Limit | Checked by | If exceeded |
|---|---|---|---|
| Function length | at most 50 lines; 200 for a function in a `.tsx` file, so a component (`components.md`, "Size and decomposition") | Lint | Extract named helpers or subcomponents |
| Nesting depth | at most 3 levels | Lint | Early returns; extract conditions |
| Parameters | at most 4 | Lint | An options object |
| File length | at most 300 lines | Lint | Split within the same folder |
| Files in a feature | under 30 | Review | Check for hidden sub-capabilities |
| Lines in a feature | under 5,000 | Review | Same |

A file of data that passes 300 lines, such as a long lookup table, is split by concept like any other file; reference data every environment needs is a migration (`docs/03-standards/database.md`, "Seeds").

### When to split a feature

1. Do **not** answer growth with a shared abstraction. Moving business rules into `shared` makes it know features.
2. Ask whether the feature holds several capabilities: different vocabulary, different users, tables that rarely join, changes that rarely touch both.
3. **Yes:** split into features that use each other's public API or events, each owning its tables (`procurement` → `procurement-requests`, `procurement-approvals`, `procurement-receiving`).
4. **No:** split files within the same layer, each named by concept. A layer stays a layer: no new folder that lint does not cover (`folder-structure.md`).

## Smells to flag in review

Lint passes these, except where a row names a rule. Review flags them (`code-review`, passes 2 and 9), and skill `refactor` moves the code to the remedy. A smell asks for a reason or a change; the complexity limits above cover length, nesting, and parameter count.

| Smell | Looks like | Remedy |
|---|---|---|
| Two reasons to change | A service or component that changes for unrelated requests | Split by responsibility ("S: Single Responsibility") |
| Check-then-write | `if (!(await findByName(name))) await insert(name)`; a status read, then an update | The database decides: a constraint, a condition in the write, or a lock (`docs/04-stack/drizzle-concurrency.md`) |
| Repeated `switch` | The same `switch` on one union in several files | One lookup keyed by the union, in its owner ("O: Open/Closed") |
| Single-use interface | An interface with one implementation and no stated test seam | A concrete module ("The gate for any abstraction") |
| Speculative generality | An option, parameter, generic, or hook no caller uses yet | Delete it; add it with its first real use |
| Boolean flag parameter | `save(data, true, false)` | Two functions, or an options object with named fields |
| Whole row as a prop | Props take a row "for convenience" | Narrow props or a DTO (`docs/03-standards/components.md`) |
| Feature envy | A function that mostly reads another feature's data | Move it to that feature; call it through `index.server.ts` (`cross-feature-communication.md`) |
| Shotgun surgery | One business change edits several features or layers | Give that knowledge one owner (`docs/03-standards/coding-standards.md`, "One owner for each piece of knowledge") |
| Magic value | The same limit or literal in a Zod schema, a check constraint, and a component; an error code or status written as a bare string at each use | A named constant in its owner, the others derived from it (`docs/03-standards/coding-standards.md`, "One owner for each piece of knowledge"). Lint rejects a bare number other than -1, 0, 1 (`no-magic-numbers`); a repeated string, a number in an object property, and a JSX prop are review |
| Hidden clock or locale | `Date.now()` in a rule; `toLocaleString()` with no locale in markup | Time as an argument (`testing.md`, rule 8); formatters in `shared/lib/format.ts` (`components.md`, "Dates and numbers in markup") |
| Fake that lies | A test fake passes where the real implementation fails | Test against the real database (`testing.md`, rule 1) |
| Junk-drawer folder | `utils/` or `common/` inside a feature | Name the concept (`folder-structure.md`) |
| Vendor SDK in a service | A payment or email SDK imported in `*.service.ts` | An interface on the service side ("D: Dependency Inversion"; placement is decision S) |
