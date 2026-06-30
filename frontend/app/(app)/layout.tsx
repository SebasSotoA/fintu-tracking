import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"
import { serverGet } from "@/lib/api/server-client"
import type { Profile } from "@/lib/api/me"

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

  const profile = await serverGet<Profile>("/api/me")
  if (!profile.onboarding_completed) redirect("/onboarding")

  // Users without an active subscription must resolve their billing state first.
  if (
    profile.subscription_status !== "active" &&
    profile.subscription_status !== "trialing"
  ) {
    redirect("/subscription")
  }

  return <AppShell>{children}</AppShell>
}
