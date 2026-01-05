import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppNav } from "@/components/layout/app-nav"
import { PerformanceMetrics } from "@/components/performance/performance-metrics"
import { PerformanceCharts } from "@/components/performance/performance-charts"
import { listTrades } from "@/lib/api/server-trades"
import { listCashFlows } from "@/lib/api/server-cash-flows"
import { listFxRates } from "@/lib/api/server-fx-rates"
import { listMarketPrices } from "@/lib/api/server-portfolio"

export default async function PerformancePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch data from API with error handling
  let trades = []
  let cashFlows = []
  let fxRates = []
  let marketPrices = []

  try {
    trades = await listTrades()
  } catch (error) {
    console.error("Failed to fetch trades:", error)
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

  try {
    marketPrices = await listMarketPrices()
  } catch (error) {
    console.error("Failed to fetch market prices:", error)
  }

  return (
    <div className="min-h-screen">
      <AppNav />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Performance</h1>
          <p className="text-muted-foreground">Analyze your investment returns and metrics</p>
        </div>
        <PerformanceMetrics
          trades={trades}
          cashFlows={cashFlows}
          fxRates={fxRates}
          marketPrices={marketPrices}
        />
        <div className="mt-8">
          <PerformanceCharts cashFlows={cashFlows} fxRates={fxRates} />
        </div>
      </div>
    </div>
  )
}
