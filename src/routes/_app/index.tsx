import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { currentUserQueryOptions } from "@/features/auth"

export const Route = createFileRoute("/_app/")({
  staticData: { title: "Beranda" },
  head: () => ({ meta: [{ title: "Beranda" }] }),
  component: HomePage,
})

function HomePage() {
  const { data: user } = useSuspenseQuery(currentUserQueryOptions())
  // The _app guard already sent a visitor without an active session elsewhere.
  if (user === null) return null
  return <p className="text-lg">Halo, {user.name}</p>
}
