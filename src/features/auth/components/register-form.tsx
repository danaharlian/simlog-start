import { Link, useNavigate } from "@tanstack/react-router"
import { useRef } from "react"
import { focusFirstInvalidControl, useAppForm } from "@/shared/ui/app-form"
import { FieldDescription, FieldGroup } from "@/shared/ui/field"
import { signUpFormErrors } from "@/features/auth/components/auth-messages"
import { AuthSplitLayout } from "@/features/auth/components/auth-split-layout"
import { FormBanner } from "@/features/auth/components/form-banner"
import { useSignUp } from "@/features/auth/hooks/use-sign-up"
import { registerSchema } from "@/features/auth/schemas"

const EMPTY_REGISTER_VALUES = {
  name: "",
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
}

export function RegisterForm() {
  const signUp = useSignUp()
  const navigate = useNavigate()
  const formRef = useRef<HTMLFormElement>(null)
  const form = useAppForm({
    defaultValues: EMPTY_REGISTER_VALUES,
    validators: {
      onChange: registerSchema,
      onSubmitAsync: async ({ value }) => {
        const result = await signUp.mutateAsync(registerSchema.parse(value))
        if (!result.ok) return signUpFormErrors(result.code, result.status)
        await navigate({ to: "/" })
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
            <h1 className="text-2xl font-bold">Daftar</h1>
            <p className="text-balance text-muted-foreground">
              Akun baru aktif setelah disetujui superadmin
            </p>
          </div>
          <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
            {(error) => <FormBanner message={error} />}
          </form.Subscribe>
          <form.AppField
            name="name"
            children={(field) => (
              <field.AppTextField label="Nama" autoComplete="name" />
            )}
          />
          <form.AppField
            name="username"
            children={(field) => (
              <field.AppTextField label="Username" autoComplete="username" />
            )}
          />
          <form.AppField
            name="email"
            children={(field) => (
              <field.AppTextField
                label="Email"
                type="email"
                autoComplete="email"
              />
            )}
          />
          <form.AppField
            name="password"
            children={(field) => (
              <field.AppTextField
                label="Password"
                type="password"
                autoComplete="new-password"
              />
            )}
          />
          <form.AppField
            name="confirmPassword"
            children={(field) => (
              <field.AppTextField
                label="Konfirmasi password"
                type="password"
                autoComplete="new-password"
              />
            )}
          />
          <form.AppForm>
            <form.AppSubmitButton label="Daftar" pendingLabel="Mendaftarkan…" />
          </form.AppForm>
          <FieldDescription className="text-center">
            Sudah punya akun? <Link to="/login">Masuk</Link>
          </FieldDescription>
        </FieldGroup>
      </form>
    </AuthSplitLayout>
  )
}
