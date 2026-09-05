"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function useSignOut(): () => Promise<void> {
  const router = useRouter()
  const queryClient = useQueryClient()

  return async () => {
    queryClient.clear()
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }
}
