"use client";

import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { ApiError } from "@/lib/api/server-client";

function QueryErrorHandler() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action?.type === "error") {
        const error = event.query.state.error;
        if (error instanceof ApiError && error.status === 402) {
          router.push("/subscription");
        }
      }
    });

    return () => unsubscribe();
  }, [router]);

  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof ApiError && error.status === 402) {
        if (typeof window !== "undefined") {
          window.location.href = "/subscription";
        }
      }
    },
  }),
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => queryClient);

  return (
    <QueryClientProvider client={client}>
      {children}
      <QueryErrorHandler />
      <Toaster />
    </QueryClientProvider>
  );
}

