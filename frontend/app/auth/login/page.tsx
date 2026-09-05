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

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { t } = useLocale()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      router.push("/dashboard")
      router.refresh()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : t("auth.error"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthFloatingCard variant="split" panel={<AuthValuePanel />}>
      <AuthFormHeader
        title={t("auth.login.title")}
        description={t("auth.login.description")}
        size="split"
      />
      <form onSubmit={handleLogin} className="flex flex-col gap-6" aria-busy={isLoading}>
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
            autoComplete="current-password"
            required
            disabled={isLoading}
            forgotHref="/auth/forgot-password"
            forgotLabel={t("auth.login.forgotPassword")}
          />
        </div>
        <AuthAlert error={error} />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" />
              {t("auth.login.submitting")}
            </>
          ) : (
            t("auth.login.submit")
          )}
        </Button>
      </form>
      <GoogleSignInSection />
      <div className="pt-2 text-center text-sm text-muted-foreground">
        {`${t("auth.login.noAccount")} `}
        <Link
          href="/auth/sign-up"
          className="font-medium text-primary hover:underline focus-visible:underline"
        >
          {t("auth.login.signUp")}
        </Link>
      </div>
    </AuthFloatingCard>
  )
}
