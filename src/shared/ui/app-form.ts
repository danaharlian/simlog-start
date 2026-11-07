import { createFormHook } from "@tanstack/react-form"
import { fieldContext, formContext } from "@/shared/ui/app-form-context"
import { AppSubmitButton } from "@/shared/ui/app-submit-button"
import { AppTextField } from "@/shared/ui/app-text-field"

export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: { AppTextField },
  formComponents: { AppSubmitButton },
})

// Moves focus to the first invalid control after a failed submit (tanstack-form.md, rule 5).
export function focusFirstInvalidControl(
  formElement: HTMLFormElement | null
): void {
  const invalid = formElement?.querySelector<HTMLElement>(
    '[aria-invalid="true"]'
  )
  invalid?.focus()
}
