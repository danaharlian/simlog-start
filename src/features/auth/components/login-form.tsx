import { Link } from "@tanstack/react-router"
import { useRef } from "react"
import { focusFirstInvalidControl, useAppForm } from "@/shared/ui/app-form"
import { FieldDescription, FieldGroup } from "@/shared/ui/field"
import { signInErrorText } from "@/features/auth/components/auth-messages"
import { AuthSplitLayout } from "@/features/auth/components/auth-split-layout"
import { FormBanner } from "@/features/auth/components/form-banner"
import { useSignIn } from "@/features/auth/hooks/use-sign-in"
import { loginSchema } from "@/features/auth/schemas"
import type { LoginFormValues } from "@/features/auth/schemas"

const EMPTY_LOGIN_VALUES = {
  identifier: "",
  password: "",
} satisfies LoginFormValues

type LoginFormProps = { readonly onSignedIn: () => Promise<void> | void }

export function LoginForm({ onSignedIn }: LoginFormProps) {
  const signIn = useSignIn()
  const formRef = useRef<HTMLFormElement>(null)
  const form = useAppForm({
    defaultValues: EMPTY_LOGIN_VALUES,
    validators: {
      // onBlur: a rule on every keystroke is noise (tanstack-form.md, rule 4); submit validates again.
      onBlur: loginSchema,
      onSubmitAsync: async ({ value }) => {
        const result = await signIn.mutateAsync(loginSchema.parse(value))
        if (!result.ok)
          return {
            form: signInErrorText(result.code, result.status),
            fields: {},
          }
        await onSignedIn()
        return undefined
      },
    },
  })

  return (
    <AuthSplitLayout>
      <form
        ref={formRef}
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void form
            .handleSubmit()
            .then(() => focusFirstInvalidControl(formRef.current))
        }}
      >
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-bold">Masuk</h1>
            <p className="text-balance text-muted-foreground">
              Masuk dengan username atau email Anda
            </p>
          </div>
          <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
            {(error) => (
              <FormBanner
                message={typeof error === "string" ? error : undefined}
              />
            )}
          </form.Subscribe>
          <form.AppField
            name="identifier"
            children={(field) => (
              <field.AppTextField
                label="Username atau email"
                autoComplete="username"
                required
              />
            )}
          />
          <form.AppField
            name="password"
            children={(field) => (
              <field.AppTextField
                label="Password"
                type="password"
                autoComplete="current-password"
                required
              />
            )}
          />
          <form.AppForm>
            <form.AppSubmitButton label="Masuk" pendingLabel="Memproses…" />
          </form.AppForm>
          <FieldDescription className="text-center">
            Belum punya akun? <Link to="/register">Daftar</Link>
          </FieldDescription>
        </FieldGroup>
      </form>
    </AuthSplitLayout>
  )
}
