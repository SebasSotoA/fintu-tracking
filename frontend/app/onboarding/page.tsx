"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Spinner } from "@/components/ui/spinner"

export default function OnboardingPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error || !user) {
        router.replace("/auth/login")
        return
      }
      router.replace("/dashboard")
    })
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="size-8" />
    </div>
  )
}
