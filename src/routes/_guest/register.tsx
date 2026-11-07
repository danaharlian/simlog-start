import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { RegisterForm } from "@/features/auth"

export const Route = createFileRoute("/_guest/register")({
  head: () => ({ meta: [{ title: "Daftar" }] }),
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()
  return <RegisterForm onRegistered={() => navigate({ to: "/" })} />
}
