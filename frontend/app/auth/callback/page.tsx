"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AuthCardSkeleton } from "@/components/auth/auth-card-skeleton"
import { useLocale } from "@/components/locale-provider"

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLocale()

  useEffect(() => {
    const code = searchParams.get("code")
    const next = searchParams.get("next") ?? "/"

    if (!code) {
      router.replace("/auth/forgot-password?error=invalid_link")
      return
    }

    const supabase = createClient()
    void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        router.replace("/auth/forgot-password?error=invalid_link")
        return
      }
      router.replace(next)
    })
  }, [router, searchParams])

  return <AuthCardSkeleton label={t("table.loading")} />
}

export default function AuthCallbackPage() {
  const { t } = useLocale()
  return (
    <Suspense fallback={<AuthCardSkeleton label={t("table.loading")} />}>
      <AuthCallbackContent />
    </Suspense>
  )
}
