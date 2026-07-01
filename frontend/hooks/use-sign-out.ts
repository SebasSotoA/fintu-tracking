"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function useSignOut(): () => Promise<void> {
  const router = useRouter()

  return async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }
}
