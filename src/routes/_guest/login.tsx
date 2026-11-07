import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { LoginForm } from "@/features/auth"

export const Route = createFileRoute("/_guest/login")({
  head: () => ({ meta: [{ title: "Masuk" }] }),
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  return <LoginForm onSignedIn={() => navigate({ to: "/" })} />
}
