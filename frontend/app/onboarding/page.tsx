import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { serverGet, handleServerAuthError } from "@/lib/api/server-client"
import type { Profile } from "@/lib/api/me"
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard"

export const dynamic = "force-dynamic"

export default async function OnboardingPage() {
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

  if (profile.onboarding_completed) redirect("/dashboard")

  return <OnboardingWizard initialProfile={profile} />
}
