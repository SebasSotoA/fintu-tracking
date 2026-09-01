"use client"

import { Suspense, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AuthCard } from "@/components/auth/auth-card"
import { Spinner } from "@/components/ui/spinner"
import { useLocale } from "@/components/locale-provider"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

export default function SignUpSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-48 items-center justify-center">
          <Spinner className="size-8" />
        </div>
      }
    >
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
