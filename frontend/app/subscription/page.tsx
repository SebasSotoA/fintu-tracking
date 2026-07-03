"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { getMe } from "@/lib/api/me"
import { listPlans, getCurrentSubscription } from "@/lib/api/subscription"
import { queryKeys } from "@/lib/api/query-keys"
import { ApiError } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import { SubscriptionPage } from "@/components/subscription/subscription-page"
import { Spinner } from "@/components/ui/spinner"

export default function SubscriptionPageClient() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error || !user) {
        router.replace("/auth/login")
      }
    })
  }, [router])

  const profileQuery = useQuery({
    queryKey: queryKeys.me(),
    queryFn: getMe,
  })

  const plansQuery = useQuery({
    queryKey: queryKeys.plans(),
    queryFn: listPlans,
    enabled: profileQuery.isSuccess,
  })

  const subscriptionQuery = useQuery({
    queryKey: queryKeys.subscription(),
    queryFn: getCurrentSubscription,
    enabled: profileQuery.isSuccess,
    retry: (_count, error) => !(error instanceof ApiError && error.status === 404),
  })

  useEffect(() => {
    const profile = profileQuery.data
    if (!profile) return

    if (!profile.onboarding_completed) {
      router.replace("/dashboard")
      return
    }

    if (profile.subscription_status === "active" || profile.subscription_status === "trialing") {
      router.replace("/dashboard")
    }
  }, [profileQuery.data, router])

  if (profileQuery.isLoading || plansQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  if (profileQuery.isError || plansQuery.isError) {
    const error = profileQuery.error ?? plansQuery.error
    if (isApiError(error) && (error.status === 401 || error.status === 402 || error.status === 403)) {
      return null
    }
    throw error
  }

  const subscription =
    subscriptionQuery.isError &&
    subscriptionQuery.error instanceof ApiError &&
    subscriptionQuery.error.status === 404
      ? null
      : subscriptionQuery.data ?? null

  if (!profileQuery.data || !plansQuery.data) {
    return null
  }

  return <SubscriptionPage plans={plansQuery.data} subscription={subscription} />
}
