import { useFormContext } from "@/shared/ui/app-form-context"
import { Button } from "@/shared/ui/button"

type AppSubmitButtonProps = {
  readonly label: string
  readonly pendingLabel: string
}

export function AppSubmitButton({ label, pendingLabel }: AppSubmitButtonProps) {
  const form = useFormContext()
  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? pendingLabel : label}
        </Button>
      )}
    </form.Subscribe>
  )
}
