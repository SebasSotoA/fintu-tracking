"use client"

import { AppRouteError } from "@/components/app-route-error"

export default function PerformanceError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <AppRouteError error={error} reset={reset} title="Performance unavailable" />
}
