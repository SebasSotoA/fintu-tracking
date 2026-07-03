"use client"

import { Suspense, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { NetWorthCard } from "@/components/dashboard/net-worth-card"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { DashboardQuickTrade } from "@/components/dashboard/dashboard-quick-trade"
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state"
import {
  HoldingsTableCardSkeleton,
  NetWorthCardSkeleton,
} from "@/components/dashboard/dashboard-card-skeleton"
import { useHoldingsData } from "@/hooks/use-holdings-data"
import { getNetWorth } from "@/lib/api/analytics"
import { queryKeys } from "@/lib/api/query-keys"
import { parsePageParams } from "@/lib/pagination/table-pagination"

export default function DashboardPage() {
  return (
    <Suspense fallback={<HoldingsTableCardSkeleton />}>
      <DashboardPageContent />
    </Suspense>
  )
}

function DashboardPageContent() {
  const searchParams = useSearchParams()
  const { page, pageSize } = useMemo(
    () => parsePageParams(Object.fromEntries(searchParams.entries())),
    [searchParams],
  )

  const netWorthQuery = useQuery({
    queryKey: queryKeys.netWorth(),
    queryFn: getNetWorth,
    retry: false,
  })

  const holdingsQuery = useHoldingsData(page, pageSize)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 items-stretch">
        <div className="flex flex-col">
          {netWorthQuery.isLoading ? (
            <NetWorthCardSkeleton />
          ) : (
            <NetWorthCard initialData={netWorthQuery.data ?? null} />
          )}
        </div>
        <div className="flex flex-col">
          <ActivityFeed />
        </div>
      </div>
      {holdingsQuery.isLoading ? (
        <HoldingsTableCardSkeleton />
      ) : holdingsQuery.data?.total === 0 ? (
        <DashboardEmptyState />
      ) : holdingsQuery.data ? (
        <DashboardQuickTrade
          holdings={holdingsQuery.data.holdings}
          total={holdingsQuery.data.total}
          page={holdingsQuery.data.page}
          pageSize={holdingsQuery.data.pageSize}
          priceUpdatedAtByTicker={holdingsQuery.data.priceUpdatedAtByTicker}
          lastPriceRefreshAt={holdingsQuery.data.lastPriceRefreshAt}
        />
      ) : null}
    </div>
  )
}
