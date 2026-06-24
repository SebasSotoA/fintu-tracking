"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthCard } from "@/components/auth/auth-card"
import { AuthAlert } from "@/components/auth/auth-alert"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useState } from "react"

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams()
  const initialError = searchParams.get("error")

  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(
    initialError === "invalid_link" ? "This reset link is invalid or has expired." : null,
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      })
      if (error) throw error
      setIsSubmitted(true)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <AuthCard
        title="Check your email"
        description={`We've sent a password reset link to ${email}`}
      >
        <p className="text-sm text-muted-foreground">
          Click the link in the email to reset your password. If you don't see it, check your spam folder.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/auth/login">Back to login</Link>
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Reset password"
      description="Enter your email address and we'll send you a link to reset your password"
      footer={
        <>
          {"Remember your password? "}
          <Link href="/auth/login" className="font-medium text-primary hover:underline">
            Back to login
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <AuthAlert error={error} />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Sending..." : "Send reset link"}
        </Button>
      </form>
    </AuthCard>
  )
}
