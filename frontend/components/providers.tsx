"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Toaster } from "@/components/ui/sonner"
import { isSubscriptionRequiredError } from "@/lib/api/errors"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
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
    <QueryClientProvider client={client}>
      {children}
      <QueryErrorHandler />
      <Toaster />
    </QueryClientProvider>
  )
}
