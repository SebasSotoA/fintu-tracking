"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthAlert } from "@/components/auth/auth-alert"
import { AuthFloatingCard } from "@/components/auth/auth-floating-card"
import { AuthFormHeader } from "@/components/auth/auth-form-header"
import { AuthPasswordField } from "@/components/auth/auth-password-field"
import { AuthValuePanel } from "@/components/auth/auth-value-panel"
import { GoogleSignInSection } from "@/components/auth/google-sign-in-button"
import { useLocale } from "@/components/locale-provider"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { t } = useLocale()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError(t("auth.passwordsMismatch"))
      setIsLoading(false)
      return
    }

    const supabase = createClient()

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/dashboard`,
        },
      })
      if (error) throw error
      router.push(`/auth/sign-up-success?email=${encodeURIComponent(email)}`)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : t("auth.error"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthFloatingCard variant="split" panel={<AuthValuePanel />}>
      <AuthFormHeader
        title={t("auth.signUp.title")}
        description={t("auth.signUp.description")}
        size="split"
      />
      <form onSubmit={handleSignUp} className="flex flex-col gap-6" aria-busy={isLoading}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="h-10 rounded-lg bg-background dark:bg-background"
            />
          </div>
          <AuthPasswordField
            id="password"
            label={t("auth.password")}
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            required
            disabled={isLoading}
            aria-invalid={error === t("auth.passwordsMismatch")}
          />
          <AuthPasswordField
            id="confirm-password"
            label={t("auth.signUp.confirmPassword")}
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            required
            disabled={isLoading}
            aria-invalid={error === t("auth.passwordsMismatch")}
          />
        </div>
        <AuthAlert error={error} />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" />
              {t("auth.signUp.submitting")}
            </>
          ) : (
            t("auth.signUp.submit")
          )}
        </Button>
      </form>
      <GoogleSignInSection />
      <div className="pt-2 text-center text-sm text-muted-foreground">
        {`${t("auth.signUp.hasAccount")} `}
        <Link
          href="/auth/login"
          className="font-medium text-primary hover:underline focus-visible:underline"
        >
          {t("auth.signUp.login")}
        </Link>
      </div>
    </AuthFloatingCard>
  )
}
