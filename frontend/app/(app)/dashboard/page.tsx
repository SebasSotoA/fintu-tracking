import { Suspense } from "react"
import { NetWorthCard } from "@/components/dashboard/net-worth-card"
import { CashBreakdownCard } from "@/components/dashboard/cash-breakdown-card"
import { HoldingsTableServer } from "@/components/dashboard/holdings-table-server"
import { getNetWorth } from "@/lib/api/server-analytics"

async function NetWorthCardServer() {
  const data = await getNetWorth().catch(() => null)
  return <NetWorthCard initialData={data} />
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="h-36 bg-muted rounded-lg animate-pulse" />}>
        <NetWorthCardServer />
      </Suspense>
      <Suspense fallback={<div className="h-64 bg-muted rounded-lg animate-pulse" />}>
        <HoldingsTableServer />
      </Suspense>
      <CashBreakdownCard />
    </div>
  )
}
