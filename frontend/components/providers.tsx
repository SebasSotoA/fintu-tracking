"use client"

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Toaster } from "@/components/ui/sonner"
import { LocaleProvider } from "@/components/locale-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { isSubscriptionRequiredError, isUnauthorizedError } from "@/lib/api/errors"
import { nextQueryCacheUserId } from "@/lib/auth/sync-query-cache-user"
import { createClient } from "@/lib/supabase/client"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error) => {
        if (isUnauthorizedError(error)) {
          window.location.href = "/auth/login"
        }
      },
    },
  },
})

function QueryErrorHandler() {
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action?.type === "error") {
        const error = event.query.state.error
        if (isSubscriptionRequiredError(error)) {
          router.push("/subscription")
        } else if (isUnauthorizedError(error)) {
          router.push("/auth/login")
        }
      }
    })

    return () => unsubscribe()
  }, [router])

  return null
}

function QueryCacheUserSync() {
  const client = useQueryClient()
  const lastUserIdRef = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user.id ?? null
      const result = nextQueryCacheUserId(lastUserIdRef.current, nextUserId)
      lastUserIdRef.current = result.lastUserId
      if (result.shouldClear) {
        client.clear()
      }
    })

    return () => subscription.unsubscribe()
  }, [client])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => queryClient)

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="fintu-theme">
      <LocaleProvider>
        <QueryClientProvider client={client}>
          {children}
          <QueryCacheUserSync />
          <QueryErrorHandler />
          <Toaster />
        </QueryClientProvider>
      </LocaleProvider>
    </ThemeProvider>
  )
}
