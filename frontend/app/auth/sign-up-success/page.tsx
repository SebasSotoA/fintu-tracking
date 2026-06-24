"use client"

import { Button } from "@/components/ui/button"
import { AuthCard } from "@/components/auth/auth-card"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"

export default function SignUpSuccessPage() {
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
      title="Check your email"
      description={`We sent a confirmation link to ${email}`}
    >
      <p className="text-sm text-muted-foreground">
        Please check your email and click the confirmation link to activate your account.
      </p>
      <Button asChild className="w-full">
        <Link href="/auth/login">Back to login</Link>
      </Button>
    </AuthCard>
  )
}
