import { FieldApi, FormApi } from "@tanstack/react-form"
import { describe, expect, it } from "vitest"
import { visibleFieldErrors } from "@/shared/ui/app-text-field"
import { registerSchema } from "@/features/auth/schemas"

// QA D2: a field's error waits until the field is left or the form is submitted, and clears as
// soon as the value is valid, without leaving the field again (tanstack-form.md, rule 4).
function registerForm() {
  const form = new FormApi({
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validators: { onChange: registerSchema },
  })
  form.mount()
  const password = new FieldApi({ form, name: "password" })
  password.mount()
  const shown = () =>
    visibleFieldErrors(password.state.meta, form.state.submissionAttempts)
  return { form, password, shown }
}

describe("waktu error kolom (QA D2, AC2, AC26)", () => {
  it("error tidak tampil saat mengetik pertama kali, tampil setelah kolom ditinggalkan", () => {
    const { password, shown } = registerForm()
    password.handleChange("abc")
    expect(shown()).toEqual([])
    password.handleBlur()
    expect(shown()).toEqual(["Password minimal 8 karakter"])
  })

  it("error hilang begitu nilai sah, tanpa meninggalkan kolom lagi", () => {
    const { password, shown } = registerForm()
    password.handleChange("abc")
    password.handleBlur()
    password.handleChange("abcdefgh")
    expect(shown()).toEqual([])
  })

  it("setelah submit, error kolom yang belum pernah ditinggalkan ikut tampil", async () => {
    const { form, shown } = registerForm()
    await form.handleSubmit()
    expect(shown()).toEqual(["Password minimal 8 karakter"])
  })
})
