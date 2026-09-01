"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Toaster } from "@/components/ui/sonner"
import { LocaleProvider } from "@/components/locale-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { isSubscriptionRequiredError, isUnauthorizedError } from "@/lib/api/errors"

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

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => queryClient)

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="fintu-theme">
      <LocaleProvider>
        <QueryClientProvider client={client}>
          {children}
          <QueryErrorHandler />
          <Toaster />
        </QueryClientProvider>
      </LocaleProvider>
    </ThemeProvider>
  )
}
