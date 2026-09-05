"use client"

import { Suspense, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { AuthCard } from "@/components/auth/auth-card"
import { AuthCardSkeleton } from "@/components/auth/auth-card-skeleton"
import { useLocale } from "@/components/locale-provider"

export default function SignUpSuccessPage() {
  const { t } = useLocale()
  return (
    <Suspense fallback={<AuthCardSkeleton label={t("table.loading")} />}>
      <SignUpSuccessContent />
    </Suspense>
  )
}

function SignUpSuccessContent() {
  const { t } = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email")

  useEffect(() => {
    if (!email) {
      router.replace("/auth/sign-up")
    }
  }, [email, router])

  if (!email) return null

  return (
    <AuthCard
      title={t("auth.signUpSuccess.title")}
      description={t("auth.signUpSuccess.description", { email })}
    >
      <p className="text-sm text-muted-foreground">
        {t("auth.signUpSuccess.body")}
      </p>
      <Button asChild className="w-full">
        <Link href="/auth/login">{t("auth.backToLogin")}</Link>
      </Button>
    </AuthCard>
  )
}
