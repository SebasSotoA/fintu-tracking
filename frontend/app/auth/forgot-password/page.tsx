"use client"

import type React from "react"
import { Suspense, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthCard } from "@/components/auth/auth-card"
import { AuthAlert } from "@/components/auth/auth-alert"
import { Spinner } from "@/components/ui/spinner"
import { useLocale } from "@/components/locale-provider"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-48 items-center justify-center">
          <Spinner className="size-8" />
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  )
}

function ForgotPasswordContent() {
  const { t } = useLocale()
  const searchParams = useSearchParams()
  const initialError = searchParams.get("error")

  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [showInvalidLink, setShowInvalidLink] = useState(initialError === "invalid_link")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const displayError = error ?? (showInvalidLink ? t("auth.forgotPassword.invalidLink") : null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)
    setShowInvalidLink(false)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      })
      if (error) throw error
      setIsSubmitted(true)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : t("auth.error"))
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <AuthCard
        title={t("auth.forgotPassword.checkEmailTitle")}
        description={t("auth.forgotPassword.checkEmailDescription", { email })}
      >
        <p className="text-sm text-muted-foreground">
          {t("auth.forgotPassword.checkEmailBody")}
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/auth/login">{t("auth.backToLogin")}</Link>
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title={t("auth.forgotPassword.title")}
      description={t("auth.forgotPassword.description")}
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
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <AuthAlert error={displayError} />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? t("auth.forgotPassword.submitting") : t("auth.forgotPassword.submit")}
        </Button>
      </form>
    </AuthCard>
  )
}
