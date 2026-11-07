import { createFileRoute } from "@tanstack/react-router"
import { RegisterForm } from "@/features/auth"

export const Route = createFileRoute("/_guest/register")({
  head: () => ({ meta: [{ title: "Daftar" }] }),
  component: RegisterForm,
})
