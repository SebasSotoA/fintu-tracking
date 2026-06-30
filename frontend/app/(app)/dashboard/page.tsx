import { Suspense } from "react"
import { NetWorthCard } from "@/components/dashboard/net-worth-card"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { DashboardQuickTrade } from "@/components/dashboard/dashboard-quick-trade"
import { fetchHoldingsData } from "@/components/dashboard/holdings-table-server"
import { getNetWorth } from "@/lib/api/server-analytics"
import { parsePageParams, type PageSize } from "@/lib/pagination/table-pagination"
import {
  ActivityFeedCardSkeleton,
  HoldingsTableCardSkeleton,
  NetWorthCardSkeleton,
} from "@/components/dashboard/dashboard-card-skeleton"

interface DashboardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

async function NetWorthCardServer() {
  const data = await getNetWorth().catch(() => null)
  return <NetWorthCard initialData={data} />
}

async function DashboardQuickTradeServer({
  page,
  pageSize,
}: {
  page: number
  pageSize: PageSize
}) {
  const data = await fetchHoldingsData(page, pageSize)
  return (
    <DashboardQuickTrade
      holdings={data.holdings}
      total={data.total}
      page={data.page}
      pageSize={data.pageSize}
      priceUpdatedAtByTicker={data.priceUpdatedAtByTicker}
      lastPriceRefreshAt={data.lastPriceRefreshAt}
    />
  )
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams
  const { page, pageSize } = parsePageParams(params)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 items-stretch">
        <div className="flex flex-col">
          <Suspense fallback={<NetWorthCardSkeleton />}>
            <NetWorthCardServer />
          </Suspense>
        </div>
        <div className="flex flex-col">
          <Suspense fallback={<ActivityFeedCardSkeleton />}>
            <ActivityFeed />
          </Suspense>
        </div>
      </div>
      <Suspense fallback={<HoldingsTableCardSkeleton />}>
        <DashboardQuickTradeServer page={page} pageSize={pageSize} />
      </Suspense>
    </div>
  )
}
