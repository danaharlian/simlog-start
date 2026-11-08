import { z } from "zod"

// field.state.meta.errors is typed any; read each entry through a schema (tanstack-form.md).
const validationIssueSchema = z.object({ message: z.string() })

function toErrorMessages(
  errors: ReadonlyArray<unknown>
): ReadonlyArray<string> {
  return errors.flatMap((error) => {
    const issue = validationIssueSchema.safeParse(error)
    return issue.success ? [issue.data.message] : []
  })
}

type FieldErrorMeta = {
  readonly isBlurred: boolean
  readonly errors: ReadonlyArray<unknown>
}

// Forms validate on change, so an error clears as soon as the value is valid. It is shown only
// once the field was left or the form was submitted, so typing is not interrupted (QA D2;
// tanstack-form.md, rule 4). After the first submit every field shows its errors live, for the
// life of the form. Kept out of the .tsx component so Fast Refresh keeps working (review T9 N4).
export function visibleFieldErrors(
  meta: FieldErrorMeta,
  submissionAttempts: number
): ReadonlyArray<string> {
  const settled = meta.isBlurred || submissionAttempts > 0
  return settled ? toErrorMessages(meta.errors) : []
}
