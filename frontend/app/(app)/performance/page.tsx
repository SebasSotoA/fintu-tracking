"use client"

import { useQuery } from "@tanstack/react-query"
import { PerformanceContent } from "@/components/performance/performance-content"
import { PerformanceEmptyState } from "@/components/performance/performance-empty-state"
import { useHoldingsData } from "@/hooks/use-holdings-data"
import { getNetWorth } from "@/lib/api/analytics"
import { queryKeys } from "@/lib/api/query-keys"
import { Spinner } from "@/components/ui/spinner"

export default function PerformancePage() {
  const holdingsQuery = useHoldingsData(1, 10)
  const netWorthQuery = useQuery({
    queryKey: queryKeys.netWorth(),
    queryFn: getNetWorth,
    retry: false,
    enabled: (holdingsQuery.data?.total ?? 0) > 0,
  })

  if (holdingsQuery.isLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  if (holdingsQuery.data?.total === 0) {
    return <PerformanceEmptyState />
  }

  return <PerformanceContent netWorth={netWorthQuery.data ?? null} />
}
