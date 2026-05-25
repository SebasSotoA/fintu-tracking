import { Suspense } from "react"
import { NetWorthCard } from "@/components/dashboard/net-worth-card"
import { HoldingsTableServer } from "@/components/dashboard/holdings-table-server"
import { RefreshPricesButton } from "@/components/dashboard/refresh-prices-button"
import { getNetWorth } from "@/lib/api/server-portfolio"
import { listFxRates } from "@/lib/api/server-fx-rates"
import type { FxSnapshot } from "@/components/dashboard/net-worth-card"

async function NetWorthCardServer() {
  const [data, fxRates] = await Promise.all([
    getNetWorth().catch(() => null),
    listFxRates().catch(() => []),
  ])
  const latest = fxRates.length > 0 ? fxRates[0] : null
  const fxSnapshot: FxSnapshot | null = latest
    ? { rate: latest.rate, date: latest.date }
    : null
  return <NetWorthCard initialData={data} fxSnapshot={fxSnapshot} />
}

export default function DashboardPage() {
  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Your portfolio at a glance</p>
        </div>
        <RefreshPricesButton className="shrink-0" />
      </div>
      <div className="space-y-6">
        <Suspense fallback={<div className="h-36 bg-muted rounded-lg animate-pulse" />}>
          <NetWorthCardServer />
        </Suspense>
        <Suspense fallback={<div className="h-64 bg-muted rounded-lg animate-pulse" />}>
          <HoldingsTableServer />
        </Suspense>
      </div>
    </>
  )
}
