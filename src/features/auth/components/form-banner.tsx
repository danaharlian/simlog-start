import { Alert, AlertDescription } from "@/shared/ui/alert"

type FormBannerProps = { readonly message: string | undefined }

// Alert already carries role="alert".
export function FormBanner({ message }: FormBannerProps) {
  if (message === undefined) return null
  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
