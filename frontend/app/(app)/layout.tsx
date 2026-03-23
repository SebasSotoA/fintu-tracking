import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppNav } from "@/components/layout/app-nav"

export const dynamic = "force-dynamic"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) redirect("/auth/login")

  return (
    <div className="min-h-screen">
      <AppNav />
      {/* Offset content by sidebar width on desktop; add bottom padding on mobile for bottom nav */}
      <main className="md:ml-72 pb-28 md:pb-0">
        <div className="container mx-auto px-4 md:px-8 py-8">{children}</div>
      </main>
    </div>
  )
}
