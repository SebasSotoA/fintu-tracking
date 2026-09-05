"use client"

import type React from "react"
import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { AuthCard } from "@/components/auth/auth-card"
import { AuthAlert } from "@/components/auth/auth-alert"
import { AuthCardSkeleton } from "@/components/auth/auth-card-skeleton"
import { AuthPasswordField } from "@/components/auth/auth-password-field"
import { useLocale } from "@/components/locale-provider"

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

  const mismatch = error === t("auth.passwordsMismatch")
  const tooShort = error === t("auth.resetPassword.passwordTooShort")

  return (
    <AuthCard
      title={t("auth.resetPassword.title")}
      description={t("auth.resetPassword.description")}
      footer={
        <>
          {`${t("auth.rememberPassword")} `}
          <Link
            href="/auth/login"
            className="font-medium text-primary hover:underline focus-visible:underline"
          >
            {t("auth.backToLogin")}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6" aria-busy={isLoading}>
        <div className="grid gap-4">
          <AuthPasswordField
            id="password"
            label={t("auth.resetPassword.newPassword")}
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            placeholder="••••••••"
            required
            minLength={6}
            disabled={isLoading}
            aria-invalid={tooShort}
          />
          <AuthPasswordField
            id="confirm-password"
            label={t("auth.resetPassword.confirmPassword")}
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            placeholder="••••••••"
            required
            disabled={isLoading}
            aria-invalid={mismatch}
          />
        </div>
        <AuthAlert error={error} />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" />
              {t("auth.resetPassword.submitting")}
            </>
          ) : (
            t("auth.resetPassword.submit")
          )}
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
