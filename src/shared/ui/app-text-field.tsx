import { useId } from "react"
import { useSelector } from "@tanstack/react-form"
import { visibleFieldErrors } from "@/shared/ui/app-field-errors"
import { useFieldContext } from "@/shared/ui/app-form-context"
import { Field, FieldError, FieldLabel } from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"

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
  const submissionAttempts = useSelector(
    field.form.store,
    (state) => state.submissionAttempts
  )
  const messages = visibleFieldErrors(field.state.meta, submissionAttempts)
  const isInvalid = messages.length > 0

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
