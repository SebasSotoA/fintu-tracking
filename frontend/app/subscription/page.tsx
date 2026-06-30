import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { serverGet } from "@/lib/api/server-client"
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

  const profile = await serverGet<Profile>("/api/me")

  // If onboarding is incomplete, finish that first.
  if (!profile.onboarding_completed) {
    redirect("/onboarding")
  }

  // Active/trialing users do not need to be on this page.
  if (profile.subscription_status === "active" || profile.subscription_status === "trialing") {
    redirect("/dashboard")
  }

  const [plans, subscription] = await Promise.all([
    serverListPlans(),
    serverGetCurrentSubscription().catch(() => null),
  ])

  return <SubscriptionPage plans={plans} subscription={subscription} />
}
