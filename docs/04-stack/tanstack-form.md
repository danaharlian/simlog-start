---
applies_to: "@tanstack/react-form v1 line (1.33.5 in the 2026-10-31 fixture)"
last_verified: 2026-10-31
verified_against: "TanStack Form validation, basic-concepts, form-composition, and listeners guides (via Context7 /tanstack/form); shadcn docs/forms/tanstack-form (via Context7 /websites/ui_shadcn); a fixture with Form 1.33.5, Query 5.105.0, Zod 4.6.7, TypeScript 6.0.3 strict, the repo's lint gates, and DOM tests (ADR 0011)"
---

# TanStack Form

**When to read:** before building or changing any form, field component, or client-side validation.

## Verified facts

- Validation accepts **Standard Schema** objects. A Zod schema can be passed directly as a validator at form level (`validators: { onChange: schema }`) or field level. Docs state Zod **≥ 3.24** is required for this.
- Fields render with `<form.Field name="..." children={(field) => ...} />`.
- Async validation supports debounce (`onChangeAsyncDebounceMs`) and can combine a schema with custom async checks.
- `createFormHook` returns `useAppForm`, `withForm`, and `withFieldGroup`. **Checked (ADR 0011):** a `withForm` section stops type-checking once the form adds `validators.onSubmitAsync`; a `withFieldGroup` section does not, and a wrong name in its `fields` map is a type error.
- `form.reset(values)` also makes those values the new defaults (`FormApi.reset` source).
- Through `useFieldContext`, `field.state.meta.errors` is `any`. Read it as `ReadonlyArray<unknown>` and parse it, or lint rejects it.

## Rules

1. **One schema, two uses.** The Zod schema in the feature's `schemas.ts` is used by the form validator **and** the server function `.validator(...)`. Never maintain two copies.
2. **Server is authoritative.** Client validation is UX. A server `validation` `AppError` (returned in a `Result`) MUST be mappable back to field errors with `toFormErrors` in `validators.onSubmitAsync`, which returns `{ form, fields }`; test this path (`docs/03-standards/error-handling.md`).
3. **Default values are explicit and typed** from the schema's input type, and come from one mapper (below). Beware schemas with transforms or coercions: form input type and output type differ; follow the docs for the installed Zod/Form versions.
4. **Validation timing:** `onChange` for cheap rules, `onBlur` for noisy ones, `onSubmit` for cross-field and server-backed checks. Debounce async checks. A form-level schema of cheap, synchronous rules runs `onChange`, including cross-field refinements such as a password confirmation, and the field component waits to **show** its error until the field is left or the form is submitted. The static options live in a `formOptions` module that the form and its test share (example below; `useStore` is deprecated in `@tanstack/react-store` 0.11.2, use `useSelector`).
5. **Accessible fields:** every input has a visible `<label>` (or equivalent), `aria-invalid` + `aria-describedby` for errors, and focus moves to the first error on failed submit.
6. **Compose with shadcn/ui primitives** in `shared/ui`. shadcn has a TanStack Form guide (`Field`, `FieldLabel`, `FieldDescription`, `FieldError`; `data-invalid` on `Field`, `aria-invalid` on the control): use those primitives, inside field components registered once in `createFormHook`, not repeated per form. Do not copy shadcn's form guidance for other libraries.
7. **Submission:** call a mutation (`useMutation`) that wraps a server function; disable submit while `isSubmitting`; read `data.ok` from the returned `Result` (an `ok: false` result is a successful call to Query); show a non-field error banner for `AppError`s that are not field-specific.
8. **No form state in global stores.** Multi-step forms keep state in a single form instance or URL search params.
9. Community adapters for shadcn + TanStack Form exist (seen on Context7) but adopting one needs an ADR.
10. **Never map fields twice.** Create defaults, edit values, and `form.reset(...)` all call the same mapper.
11. **Reactive logic uses field `listeners`, not `useEffect`.** Clearing a dependent field is `listeners={{ onChange }}`. A total is derived while rendering, not stored (`docs/02-architecture/state-management.md`, rule 2). Move logic to a hook in `hooks/` only when it grows or is shared.

## Form structure

A form with one or two groups of fields can be a single file. Split a larger one by domain (size guideline: `docs/03-standards/components.md`):

| Layer | File | Does | Does not |
|---|---|---|---|
| Field and button wrappers | `shared/ui/app-form.ts`, `shared/ui/app-<name>.tsx` | Field plumbing, error display, once for the whole app | Know a feature |
| Orchestrator | `components/<entity>-form.tsx` | Create the form, submit, compose sections, form-level errors | Detailed field markup |
| Header (when it has logic) | `components/<entity>-form-header.tsx` | Title, breadcrumbs, actions | Touch field values |
| Sections | `components/sections/<domain>-fields.tsx` | Render one domain's fields | Hold a second state, call a mutation |
| Pure mappers | `components/<entity>-form-values.ts` | Entity to form values; form values to server input | Import React or a server function |

Mappers go in `components/`, not `utils/`: that folder would get no layer rules (`docs/03-standards/linting-and-formatting.md`).

### The shared hook (once per app)

```ts
// shared/ui/form-context.ts
export const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts()

// shared/ui/app-form.ts
export const { useAppForm, withFieldGroup } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: { AppTextField },
  formComponents: { AppSubmitButton },
})
```

```tsx
// shared/ui/app-text-field.tsx (essentials; use the Field and Input primitives for the markup)
const validationIssueSchema = z.object({ message: z.string() })

function toErrorMessages(errors: ReadonlyArray<unknown>): ReadonlyArray<string> {
  return errors.flatMap((error) => {
    const issue = validationIssueSchema.safeParse(error)
    return issue.success ? [issue.data.message] : []
  })
}

// Forms validate onChange, so an error clears as soon as the value is valid; it is shown only after
// the field is left (isBlurred) or a submit, so typing is not interrupted (specs/auth QA D2, 2026-11-08).
// With an onBlur validator, an old error stays until the next blur.
export function AppTextField({ label }: { readonly label: string }) {
  const field = useFieldContext<string>()
  const submissionAttempts = useSelector(field.form.store, (state) => state.submissionAttempts)
  // visibleFieldErrors (shared/ui/app-field-errors.ts): errors only once isBlurred or after a submit
  const messages = visibleFieldErrors(field.state.meta, submissionAttempts)
  const isInvalid = messages.length > 0
  // value={field.state.value}, onBlur={field.handleBlur},
  // onChange={(event) => field.handleChange(event.target.value)}, aria-invalid={isInvalid}
}
```

### A feature form

```ts
// features/customers/components/customer-form-values.ts
export function toCustomerFormValues(customer?: Customer): CustomerFormValues {
  return {
    name: customer?.name ?? '',
    email: customer?.email ?? '',
    country: customer?.country ?? '',
    province: customer?.province ?? '',
  }
}

export function toCustomerInput(values: CustomerInput): CustomerInput {
  return { ...values, email: values.email.toLowerCase() }
}
```

```tsx
// features/customers/components/sections/customer-address-fields.tsx
export const CustomerAddressFields = withFieldGroup({
  defaultValues: { country: '', province: '' }, // for types and mapping; not used at runtime
  render: function Render({ group }) {
    return (
      <>
        <group.AppField
          name="country"
          listeners={{ onChange: () => group.setFieldValue('province', '') }}
          children={(field) => <field.AppTextField label="Country" />}
        />
        <group.AppField name="province" children={(field) => <field.AppTextField label="Province" />} />
      </>
    )
  },
})
```

```tsx
// features/customers/components/customer-form.tsx
export function CustomerForm({ customer, save }: CustomerFormProps) {
  const mutation = useMutation({ mutationFn: save })
  const form = useAppForm({
    defaultValues: toCustomerFormValues(customer),
    validators: {
      onChange: customerFormSchema,
      onSubmitAsync: async ({ value, formApi }) => {
        const result = await mutation.mutateAsync(toCustomerInput(customerFormSchema.parse(value)))
        if (!result.ok) return toFormErrors(result.error)
        formApi.reset(toCustomerFormValues(result.data))
        return undefined
      },
    },
  })

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <CustomerContactFields form={form} fields={{ name: 'name', email: 'email' }} />
      <CustomerAddressFields form={form} fields={{ country: 'country', province: 'province' }} />
      <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
        {(error) => (typeof error === 'string' ? <p role="alert">{error}</p> : null)}
      </form.Subscribe>
      <form.AppForm>
        <form.AppSubmitButton label="Save" />
      </form.AppForm>
    </form>
  )
}
```

**Checked (ADR 0011), with plain elements in place of primitives:** type-check, lint, and DOM tests for edit values, the listener, a Zod message with `aria-describedby`, the mapped input and reset on `ok`, a server field error reaching its field, and a form banner. **Not checked:** real shadcn primitives, SSR and hydration, invalidating queries from this path. The real mutation lives in a `hooks/` hook that invalidates when `data.ok` (`tanstack-query.md`); `save` here keeps the example short. Imports are omitted above.

## Tests

Mappers: plain unit tests, including that every field has a value. The form: each row above for any form with server-backed rules (`docs/03-standards/testing.md`).

## Pitfalls

- Passing a Zod version below the Standard Schema requirement.
- Different schemas on client and server causing drift.
- Using `onChange` async validation without debounce (request storms).
- Copying react-hook-form patterns (`zodResolver`, `Control`, `watch`, `setValue` in an effect): none exist here.
- Sending a server field error as a plain string: `toErrorMessages` above drops it. `toFormErrors` produces `{ message }` (`error-handling.md`).

## Verify before use

`createFieldMap` (a shortcut for same-named `fields`, seen in the form-composition guide), array fields API, async `listeners` debounce, `onSubmitMeta`, Zod integration notes for the installed major.
