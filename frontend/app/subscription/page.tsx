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
import { PlanPickerSkeleton } from "@/components/subscription/plan-picker-skeleton"
import { useLocale } from "@/components/locale-provider"

export default function SubscriptionPageClient() {
  const router = useRouter()
  const { t } = useLocale()

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
      <div className="mx-auto max-w-3xl space-y-6">
        <PlanPickerSkeleton label={t("table.loading")} />
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
