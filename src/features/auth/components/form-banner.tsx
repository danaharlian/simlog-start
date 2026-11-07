import { Alert, AlertDescription } from "@/shared/ui/alert"

export function FormBanner({ message }: { readonly message: unknown }) {
  if (typeof message !== "string") return null
  return (
    <Alert variant="destructive" role="alert">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
