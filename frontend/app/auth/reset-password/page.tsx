"use client"

import type React from "react"
import { Suspense, useEffect, useState } from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthCard } from "@/components/auth/auth-card"
import { AuthAlert } from "@/components/auth/auth-alert"
import { AuthCardSkeleton } from "@/components/auth/auth-card-skeleton"
import { useLocale } from "@/components/locale-provider"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

function ResetPasswordContent() {
  const { t } = useLocale()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const linkError = searchParams.get("error")

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      setHasSession(!!data.session)
      setIsCheckingSession(false)

      if (!data.session && linkError !== "invalid_link") {
        router.replace("/auth/forgot-password")
      }
    }

    checkSession()
  }, [linkError, router])

  if (isCheckingSession) {
    return <AuthCardSkeleton label={t("table.loading")} />
  }

  if (!hasSession && linkError === "invalid_link") {
    return (
      <AuthCard
        title={t("auth.resetPassword.invalidTitle")}
        description={t("auth.resetPassword.invalidDescription")}
      >
        <Button asChild className="w-full">
          <Link href="/auth/forgot-password">{t("auth.resetPassword.requestNewLink")}</Link>
        </Button>
      </AuthCard>
    )
  }

  if (!hasSession) {
    return null
  }

  if (isSuccess) {
    return (
      <AuthCard
        title={t("auth.resetPassword.successTitle")}
        description={t("auth.resetPassword.successDescription")}
      >
        <Button asChild className="w-full">
          <Link href="/dashboard">{t("auth.resetPassword.goToDashboard")}</Link>
        </Button>
      </AuthCard>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setError(t("auth.passwordsMismatch"))
      return
    }

    if (password.length < 6) {
      setError(t("auth.resetPassword.passwordTooShort"))
      return
    }

    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setIsSuccess(true)
      setTimeout(() => {
        router.push("/dashboard")
      }, 2000)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : t("auth.error"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthCard
      title={t("auth.resetPassword.title")}
      description={t("auth.resetPassword.description")}
      footer={
        <>
          {`${t("auth.rememberPassword")} `}
          <Link href="/auth/login" className="font-medium text-primary hover:underline">
            {t("auth.backToLogin")}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.resetPassword.newPassword")}</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">{t("auth.resetPassword.confirmPassword")}</Label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="••••••••"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <AuthAlert error={error} />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? t("auth.resetPassword.submitting") : t("auth.resetPassword.submit")}
        </Button>
      </form>
    </AuthCard>
  )
}

function ResetPasswordFallback() {
  const { t } = useLocale()
  return <AuthCardSkeleton label={t("table.loading")} />
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordContent />
    </Suspense>
  )
}
