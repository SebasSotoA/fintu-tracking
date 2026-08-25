"use client"

import { Suspense, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import Decimal from "decimal.js"
import { NetWorthCard } from "@/components/dashboard/net-worth-card"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { DashboardQuickTrade } from "@/components/dashboard/dashboard-quick-trade"
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state"
import { KpiStrip } from "@/components/dashboard/kpi-strip"
import { AssetAllocationCard } from "@/components/dashboard/asset-allocation-card"
import { TopHoldingsCard } from "@/components/dashboard/top-holdings-card"
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

  const portfolioTotal = new Decimal(netWorthQuery.data?.net_worth || "0").toNumber()

  return (
    <div className="space-y-6">
      <div
        className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-[1fr_auto_1fr] gap-4 md:gap-6"
        data-testid="dashboard-primary-grid"
      >
        {/* Row 1: Portfolio Total (left) + Top Holdings (right) */}
        <div className="lg:row-start-1 lg:row-end-2 lg:col-start-1 lg:col-end-2">
          {netWorthQuery.isLoading ? (
            <NetWorthCardSkeleton />
          ) : (
            <NetWorthCard initialData={netWorthQuery.data ?? null} />
          )}
        </div>
        <div className="lg:row-start-1 lg:row-end-2 lg:col-start-2 lg:col-end-3">
          {netWorthQuery.data && (
            <TopHoldingsCard
              holdings={holdingsQuery.data?.holdings ?? []}
              totalPortfolioValue={portfolioTotal}
              limit={5}
            />
          )}
        </div>

        {/* Row 2: KPI strip (left, compact) */}
        <div className="lg:row-start-2 lg:row-end-3 lg:col-start-1 lg:col-end-2">
          <KpiStrip initialData={netWorthQuery.data ?? null} />
        </div>

        {/* Row 3: Asset Allocation (left, fills) */}
        <div className="lg:row-start-3 lg:row-end-4 lg:col-start-1 lg:col-end-2">
          {netWorthQuery.data && (
            <AssetAllocationCard data={netWorthQuery.data} />
          )}
        </div>

        {/* Right column: Recent Activity spans rows 2 and 3 */}
        <div className="lg:row-start-2 lg:row-end-4 lg:col-start-2 lg:col-end-3">
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