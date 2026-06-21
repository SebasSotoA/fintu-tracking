import { Suspense } from "react"
import { NetWorthCard } from "@/components/dashboard/net-worth-card"
import { PortfolioHealthBanner } from "@/components/dashboard/portfolio-health-banner"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { DashboardQuickTrade } from "@/components/dashboard/dashboard-quick-trade"
import { fetchHoldingsData } from "@/components/dashboard/holdings-table-server"
import { getNetWorth } from "@/lib/api/server-analytics"

async function NetWorthCardServer() {
  const data = await getNetWorth().catch(() => null)
  return <NetWorthCard initialData={data} />
}

async function DashboardQuickTradeServer() {
  const data = await fetchHoldingsData()
  return (
    <DashboardQuickTrade
      holdings={data.holdings}
      priceUpdatedAtByTicker={data.priceUpdatedAtByTicker}
      lastPriceRefreshAt={data.lastPriceRefreshAt}
    />
  )
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PortfolioHealthBanner />
      <Suspense fallback={<div className="h-36 bg-muted rounded-lg animate-pulse" />}>
        <NetWorthCardServer />
      </Suspense>
      <Suspense fallback={<div className="h-16 bg-muted rounded-lg animate-pulse" />}>
        <ActivityFeed />
      </Suspense>
      <Suspense fallback={<div className="h-64 bg-muted rounded-lg animate-pulse" />}>
        <DashboardQuickTradeServer />
      </Suspense>
    </div>
  )
}
