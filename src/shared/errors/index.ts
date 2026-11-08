// The error model of docs/03-standards/error-handling.md: plain objects, no classes (ADR 0006).
export type FieldErrors = Readonly<Record<string, ReadonlyArray<string>>>

type Base<TKind extends string, TCode extends string> = {
  readonly kind: TKind
  readonly code: TCode
  readonly message: string
}

export type AppError<TCode extends string = string> =
  | (Base<"validation", TCode> & { readonly fieldErrors: FieldErrors })
  | Base<"unauthorized", TCode>
  | Base<"forbidden", TCode>
  | Base<"not_found", TCode>
  | Base<"conflict", TCode>

export const appError = {
  validation: <TCode extends string>(
    code: TCode,
    message: string,
    fieldErrors: FieldErrors = {}
  ): AppError<TCode> => ({
    kind: "validation",
    code,
    message,
    fieldErrors,
  }),
  unauthorized: <TCode extends string>(
    code: TCode,
    message: string
  ): AppError<TCode> => ({
    kind: "unauthorized",
    code,
    message,
  }),
  forbidden: <TCode extends string>(
    code: TCode,
    message: string
  ): AppError<TCode> => ({ kind: "forbidden", code, message }),
  notFound: <TCode extends string>(
    code: TCode,
    message: string
  ): AppError<TCode> => ({ kind: "not_found", code, message }),
  conflict: <TCode extends string>(
    code: TCode,
    message: string
  ): AppError<TCode> => ({ kind: "conflict", code, message }),
}

export type Ok<T> = { readonly ok: true; readonly data: T }
export type Err<TError> = { readonly ok: false; readonly error: TError }
export type Result<T, TError = AppError> = Ok<T> | Err<TError>

export const ok = <T>(data: T): Ok<T> => ({ ok: true, data })
export const err = <TError>(error: TError): Err<TError> => ({
  ok: false,
  error,
})
