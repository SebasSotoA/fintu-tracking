import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"
import { serverGet, ApiError } from "@/lib/api/server-client"
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

  let profile: Profile | null = null
  try {
    profile = await serverGet<Profile>("/api/me")
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) redirect("/auth/login")
      if (error.status === 402 || error.status === 403) redirect("/subscription")
    }
    // On 404 or other errors, render the app shell without a profile.
  }

  if (profile && !profile.onboarding_completed) redirect("/onboarding")

  // Users without an active subscription must resolve their billing state first.
  if (
    profile &&
    profile.subscription_status !== "active" &&
    profile.subscription_status !== "trialing"
  ) {
    redirect("/subscription")
  }

  return <AppShell>{children}</AppShell>
}
