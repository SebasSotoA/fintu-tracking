import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppNav } from "@/components/layout/app-nav"
import { NetWorthCard } from "@/components/dashboard/net-worth-card"
import { PortfolioSummary } from "@/components/dashboard/portfolio-summary"
import { HoldingsTable } from "@/components/dashboard/holdings-table"
import { getHoldings } from "@/lib/api/server-portfolio"
import { listCashFlows } from "@/lib/api/server-cash-flows"
import { listFxRates } from "@/lib/api/server-fx-rates"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch data from API with error handling
  let holdings = []
  let cashFlows = []
  let fxRates = []

  try {
    holdings = await getHoldings()
  } catch (error) {
    console.error("Failed to fetch holdings:", error)
  }

  try {
    cashFlows = await listCashFlows()
  } catch (error) {
    console.error("Failed to fetch cash flows:", error)
  }

  try {
    fxRates = await listFxRates()
  } catch (error) {
    console.error("Failed to fetch FX rates:", error)
  }

  const latestFxRate = fxRates.length > 0 ? fxRates[0].rate : null

  return (
    <div className="min-h-screen">
      <AppNav />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Your portfolio at a glance</p>
        </div>
        <div className="space-y-6">
          <NetWorthCard />
          <PortfolioSummary
            holdings={holdings}
            cashFlows={cashFlows}
            latestFxRate={latestFxRate}
          />
          <HoldingsTable holdings={holdings} />
        </div>
      </div>
    </div>
  )
}
