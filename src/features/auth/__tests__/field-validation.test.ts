import { FieldApi, FormApi } from "@tanstack/react-form"
import { describe, expect, it } from "vitest"
import { visibleFieldErrors } from "@/shared/ui/app-field-errors"
import {
  loginFormOptions,
  registerFormOptions,
} from "@/features/auth/components/auth-form-options"

// QA D2: a field's error waits until the field is left or the form is submitted, and clears as
// soon as the value is valid, without leaving the field again (tanstack-form.md, rule 4).
// Built from the forms' own options, so a form that goes back to onBlur fails here (review T9 S1).
function registerForm() {
  const form = new FormApi(registerFormOptions)
  form.mount()
  const field = (name: "password" | "confirmPassword") => {
    const api = new FieldApi({ form, name })
    api.mount()
    return {
      api,
      shown: () =>
        visibleFieldErrors(api.state.meta, form.state.submissionAttempts),
    }
  }
  return {
    form,
    password: field("password"),
    confirm: field("confirmPassword"),
  }
}

describe("waktu error kolom (QA D2, AC2, AC26)", () => {
  it("error tidak tampil saat mengetik pertama kali, tampil setelah kolom ditinggalkan", () => {
    const { password } = registerForm()
    password.api.handleChange("abc")
    expect(password.shown()).toEqual([])
    password.api.handleBlur()
    expect(password.shown()).toEqual(["Password minimal 8 karakter"])
  })

  it("error hilang begitu nilai sah, tanpa meninggalkan kolom lagi (reproduksi D2)", () => {
    const { password } = registerForm()
    password.api.handleChange("abc")
    password.api.handleBlur()
    password.api.handleChange("abcdefgh")
    expect(password.shown()).toEqual([])
  })

  it("setelah submit, error kolom yang belum pernah ditinggalkan ikut tampil", async () => {
    const { form, password } = registerForm()
    await form.handleSubmit()
    expect(password.shown()).toEqual(["Password minimal 8 karakter"])
  })

  it("konfirmasi yang sudah ditinggalkan langsung menandai password yang berubah, dan hilang saat sama lagi", () => {
    const { password, confirm } = registerForm()
    password.api.handleChange("rahasia-123")
    confirm.api.handleChange("rahasia-123")
    confirm.api.handleBlur()
    password.api.handleChange("rahasia-1234")
    expect(confirm.shown()).toEqual(["Konfirmasi password tidak sama"])
    password.api.handleChange("rahasia-123")
    expect(confirm.shown()).toEqual([])
  })

  it("form login memakai waktu yang sama", () => {
    const form = new FormApi(loginFormOptions)
    form.mount()
    const password = new FieldApi({ form, name: "password" })
    password.mount()
    password.handleChange("")
    password.handleBlur()
    expect(
      visibleFieldErrors(password.state.meta, form.state.submissionAttempts)
    ).not.toEqual([])
    password.handleChange("apa-saja")
    expect(
      visibleFieldErrors(password.state.meta, form.state.submissionAttempts)
    ).toEqual([])
  })
})
