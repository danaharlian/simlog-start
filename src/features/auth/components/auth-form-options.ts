import { formOptions } from "@tanstack/react-form"
import { loginSchema, registerSchema } from "@/features/auth/schemas"
import type {
  LoginFormValues,
  RegisterFormValues,
} from "@/features/auth/schemas"

// The static part of each form's options, shared by the form and its test, so the test proves
// the shipped validation timing (review T9 S1). onChange: an error clears as soon as the value
// is valid; AppTextField shows it only after the field is left or a submit (QA D2).

export const registerFormOptions = formOptions({
  defaultValues: {
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  } satisfies RegisterFormValues,
  validators: { onChange: registerSchema },
})

export const loginFormOptions = formOptions({
  defaultValues: { identifier: "", password: "" } satisfies LoginFormValues,
  validators: { onChange: loginSchema },
})
