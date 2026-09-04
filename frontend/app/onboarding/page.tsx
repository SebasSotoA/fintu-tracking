"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AppShellSkeleton } from "@/components/layout/app-shell-skeleton"
import { TablePageSkeleton } from "@/components/ui/table-page-skeleton"
import { useLocale } from "@/components/locale-provider"

export default function OnboardingPage() {
  const router = useRouter()
  const { t } = useLocale()

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error || !user) {
        router.replace("/auth/login")
        return
      }
      router.replace("/dashboard")
    })
  }, [router])

  return (
    <AppShellSkeleton label={t("table.loading")}>
      <TablePageSkeleton nested />
    </AppShellSkeleton>
  )
}
