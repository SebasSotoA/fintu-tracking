"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AppShell } from "@/components/layout/app-shell"
import { AppShellSkeleton } from "@/components/layout/app-shell-skeleton"
import { TablePageSkeleton } from "@/components/ui/table-page-skeleton"
import { useLocale } from "@/components/locale-provider"
import { useMe } from "@/hooks/use-me"
import { isApiError, isSubscriptionRequiredError, isUnauthorizedError } from "@/lib/api/errors"

interface ProtectedLayoutProps {
  children: ReactNode
  requireActiveSubscription?: boolean
}

export function ProtectedLayout({
  children,
  requireActiveSubscription = true,
}: ProtectedLayoutProps) {
  const router = useRouter()
  const { t } = useLocale()
  const { data: profile, error, isLoading, isError, isFetched } = useMe()
  const [authChecked, setAuthChecked] = useState(false)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data: { user }, error: authError }) => {
      if (authError || !user) {
        router.replace("/auth/login")
        setHasSession(false)
      } else {
        setHasSession(true)
      }
      setAuthChecked(true)
    })
  }, [router])

  useEffect(() => {
    if (!authChecked || !hasSession || !isFetched) return

    if (isError && error) {
      if (isUnauthorizedError(error)) {
        router.replace("/auth/login")
        return
      }
      if (isSubscriptionRequiredError(error)) {
        router.replace("/subscription")
        return
      }
      if (isApiError(error)) {
        router.replace("/subscription")
        return
      }
    }

    if (!profile) return

    if (
      requireActiveSubscription &&
      profile.onboarding_completed &&
      profile.subscription_status !== "active" &&
      profile.subscription_status !== "trialing"
    ) {
      router.replace("/subscription")
    }
  }, [
    authChecked,
    hasSession,
    isFetched,
    isError,
    error,
    profile,
    requireActiveSubscription,
    router,
  ])

  if (!authChecked || !hasSession || isLoading) {
    return (
      <AppShellSkeleton label={t("table.loading")}>
        <TablePageSkeleton nested />
      </AppShellSkeleton>
    )
  }

  if (isError && !profile) {
    return null
  }

  return <AppShell initialProfile={profile}>{children}</AppShell>
}
