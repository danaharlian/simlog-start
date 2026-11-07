import { useId } from "react"
import { z } from "zod"
import { useFieldContext } from "@/shared/ui/app-form-context"
import { Field, FieldError, FieldLabel } from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"

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

type AppTextFieldProps = {
  readonly label: string
  readonly type?: "text" | "email" | "password"
  readonly autoComplete?: string
  readonly required?: boolean
}

export function AppTextField({
  label,
  type = "text",
  autoComplete,
  required = false,
}: AppTextFieldProps) {
  const field = useFieldContext<string>()
  const inputId = useId()
  const errorId = `${inputId}-error`
  const messages = toErrorMessages(field.state.meta.errors)
  const isInvalid = field.state.meta.isTouched && messages.length > 0

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <Input
        id={inputId}
        name={field.name}
        type={type}
        autoComplete={autoComplete}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        aria-required={required}
        aria-invalid={isInvalid}
        aria-describedby={isInvalid ? errorId : undefined}
      />
      {isInvalid ? (
        <FieldError
          id={errorId}
          errors={messages.map((message) => ({ message }))}
        />
      ) : null}
    </Field>
  )
}
