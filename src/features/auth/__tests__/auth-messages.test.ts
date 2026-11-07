import { describe, expect, it } from "vitest"
import {
  signInErrorText,
  signUpFormErrors,
} from "@/features/auth/components/auth-messages"
import { signInMethodFor } from "@/features/auth/components/sign-in-method"

const HTTP_UNAUTHORIZED = 401
const HTTP_BAD_REQUEST = 400
const HTTP_UNPROCESSABLE = 422
const HTTP_TOO_MANY_REQUESTS = 429

describe("signInErrorText (AC7, EC6, EC7)", () => {
  it("dua kode login gagal memetakan ke teks yang sama", () => {
    const byEmail = signInErrorText(
      "INVALID_EMAIL_OR_PASSWORD",
      HTTP_UNAUTHORIZED
    )
    const byUsername = signInErrorText(
      "INVALID_USERNAME_OR_PASSWORD",
      HTTP_UNAUTHORIZED
    )
    expect(byEmail).toBe("Username/email atau password salah")
    expect(byUsername).toBe(byEmail)
  })

  it("429 menjadi pesan coba lagi nanti", () => {
    expect(signInErrorText(undefined, HTTP_TOO_MANY_REQUESTS)).toBe(
      "Terlalu banyak percobaan, coba lagi nanti"
    )
  })
})

describe("signUpFormErrors (EC1 to EC3, EC7)", () => {
  it("email sudah dipakai jatuh ke kolom email", () => {
    expect(
      signUpFormErrors(
        "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
        HTTP_UNPROCESSABLE
      ).fields
    ).toEqual({
      email: [{ message: "Email sudah dipakai" }],
    })
  })

  it("username sudah dipakai dan username tidak sah jatuh ke kolom username", () => {
    expect(
      signUpFormErrors("USERNAME_IS_ALREADY_TAKEN", HTTP_BAD_REQUEST).fields
    ).toEqual({
      username: [{ message: "Username sudah dipakai" }],
    })
    expect(
      signUpFormErrors("AUTH_USERNAME_REQUIRED", HTTP_BAD_REQUEST).fields
        .username
    ).toBeDefined()
  })

  it("429 dan kode lain menjadi banner form", () => {
    expect(signUpFormErrors(undefined, HTTP_TOO_MANY_REQUESTS).form).toBe(
      "Terlalu banyak percobaan, coba lagi nanti"
    )
    expect(signUpFormErrors("SOMETHING_ELSE", HTTP_BAD_REQUEST).form).toBe(
      "Pendaftaran gagal. Coba lagi."
    )
    expect(
      signUpFormErrors("FAILED_TO_CREATE_USER", HTTP_UNPROCESSABLE).form
    ).toBe("Pendaftaran gagal. Coba lagi.")
  })
})

describe("signInMethodFor (ADR 0039, Q6)", () => {
  it("nilai dengan @ ke endpoint email, selain itu ke endpoint username", () => {
    expect(signInMethodFor(" Budi@Contoh.id ")).toEqual({
      kind: "email",
      email: "Budi@Contoh.id",
    })
    expect(signInMethodFor("BUDI")).toEqual({
      kind: "username",
      username: "BUDI",
    })
  })
})
