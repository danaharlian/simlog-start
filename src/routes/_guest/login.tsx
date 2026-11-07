import { createFileRoute } from "@tanstack/react-router"
import { LoginForm } from "@/features/auth"

export const Route = createFileRoute("/_guest/login")({
  head: () => ({ meta: [{ title: "Masuk" }] }),
  component: LoginForm,
})
