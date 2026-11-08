import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { currentUserQueryOptions } from "@/features/auth"

export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [{ title: "Beranda" }] }),
  component: HomePage,
})

function HomePage() {
  const { data: user } = useSuspenseQuery(currentUserQueryOptions())
  return <p className="text-lg">Halo, {user?.name}</p>
}
