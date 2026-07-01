import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"
import { serverGet, handleServerAuthError } from "@/lib/api/server-client"
import { isApiError } from "@/lib/api/errors"
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

  let profile: Profile
  try {
    profile = await serverGet<Profile>("/api/me")
  } catch (error) {
    if (isApiError(error) && (error.status === 401 || error.status === 402 || error.status === 403)) {
      handleServerAuthError(error)
    }
    redirect("/subscription")
  }

  if (!profile.onboarding_completed) redirect("/onboarding")

  if (
    profile.subscription_status !== "active" &&
    profile.subscription_status !== "trialing"
  ) {
    redirect("/subscription")
  }

  return <AppShell>{children}</AppShell>
}
