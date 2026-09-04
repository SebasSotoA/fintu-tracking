"use client"

import { useQuery } from "@tanstack/react-query"
import { useLocale } from "@/components/locale-provider"
import { PerformanceContent } from "@/components/performance/performance-content"
import { PerformanceEmptyState } from "@/components/performance/performance-empty-state"
import { PerformancePageSkeleton } from "@/components/performance/performance-page-skeleton"
import { useHoldingsData } from "@/hooks/use-holdings-data"
import { getNetWorth } from "@/lib/api/analytics"
import { queryKeys } from "@/lib/api/query-keys"

export default function PerformancePage() {
  const { t } = useLocale()
  const holdingsQuery = useHoldingsData(1, 10)
  const netWorthQuery = useQuery({
    queryKey: queryKeys.netWorth(),
    queryFn: getNetWorth,
    retry: false,
    enabled: (holdingsQuery.data?.total ?? 0) > 0,
  })

  if (holdingsQuery.isLoading) {
    return <PerformancePageSkeleton label={t("table.loading")} />
  }

  if (holdingsQuery.data?.total === 0) {
    return <PerformanceEmptyState />
  }

  return <PerformanceContent netWorth={netWorthQuery.data ?? null} />
}
