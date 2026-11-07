import type { ReactNode } from "react"
import { Card, CardContent } from "@/shared/ui/card"

// Layout of the login-04 block: form on one side, image on the other from md up (R23).
export function AuthSplitLayout({
  children,
}: {
  readonly children: ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <Card className="overflow-hidden p-0">
          <CardContent className="grid p-0 md:grid-cols-2">
            <div className="p-6 md:p-8">{children}</div>
            <div className="relative hidden bg-muted md:block">
              <img
                src="/bdh.avif"
                alt=""
                className="absolute inset-0 h-full w-full object-cover dark:brightness-50 dark:grayscale"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
