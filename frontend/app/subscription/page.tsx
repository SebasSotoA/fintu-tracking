import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { serverGet, handleServerAuthError } from "@/lib/api/server-client"
import { isApiError } from "@/lib/api/errors"
import { serverListPlans, serverGetCurrentSubscription } from "@/lib/api/server-subscription"
import type { Profile } from "@/lib/api/me"
import { SubscriptionPage } from "@/components/subscription/subscription-page"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Subscription | Fintu",
}

export default async function SubscriptionPageServer() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  let profile: Profile
  try {
    profile = await serverGet<Profile>("/api/me")
  } catch (error) {
    handleServerAuthError(error)
  }

  // If onboarding is incomplete, finish that first.
  if (!profile.onboarding_completed) {
    redirect("/onboarding")
  }

  // Active/trialing users do not need to be on this page.
  if (profile.subscription_status === "active" || profile.subscription_status === "trialing") {
    redirect("/dashboard")
  }

  let plans: Awaited<ReturnType<typeof serverListPlans>>
  try {
    plans = await serverListPlans()
  } catch (error) {
    if (isApiError(error)) {
      handleServerAuthError(error)
    }
    throw error
  }

  let subscription: Awaited<ReturnType<typeof serverGetCurrentSubscription>> | null = null
  try {
    subscription = await serverGetCurrentSubscription()
  } catch (error) {
    if (isApiError(error)) {
      if (error.status === 404) {
        subscription = null
      } else {
        handleServerAuthError(error)
      }
    } else {
      throw error
    }
  }

  return <SubscriptionPage plans={plans} subscription={subscription} />
}
