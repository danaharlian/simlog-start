export type SignInMethod =
  | { readonly kind: "email"; readonly email: string }
  | { readonly kind: "username"; readonly username: string }

// The username validator rejects "@", so a value with "@" can only be an email (ADR 0039).
export function signInMethodFor(identifier: string): SignInMethod {
  const value = identifier.trim()
  return value.includes("@")
    ? { kind: "email", email: value }
    : { kind: "username", username: value }
}
