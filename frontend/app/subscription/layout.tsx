import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"
import { serverGet, handleServerAuthError } from "@/lib/api/server-client"
import type { Profile } from "@/lib/api/me"

export const dynamic = "force-dynamic"

export default async function SubscriptionLayout({
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
    handleServerAuthError(error)
  }

  return <AppShell initialProfile={profile}>{children}</AppShell>
}
