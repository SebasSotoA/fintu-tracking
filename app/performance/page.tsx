import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppNav } from "@/components/layout/app-nav"
import { PerformanceMetrics } from "@/components/performance/performance-metrics"
import { PerformanceCharts } from "@/components/performance/performance-charts"

export default async function PerformancePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: trades } = await supabase
    .from("trades")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: true })

  const { data: cashFlows } = await supabase
    .from("cash_flows")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: true })

  const { data: fxRates } = await supabase
    .from("fx_rates")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })

  const { data: marketPrices } = await supabase.from("market_prices").select("*")

  return (
    <div className="min-h-screen">
      <AppNav />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Performance</h1>
          <p className="text-muted-foreground">Analyze your investment returns and metrics</p>
        </div>
        <PerformanceMetrics
          trades={trades || []}
          cashFlows={cashFlows || []}
          fxRates={fxRates || []}
          marketPrices={marketPrices || []}
        />
        <div className="mt-8">
          <PerformanceCharts cashFlows={cashFlows || []} fxRates={fxRates || []} />
        </div>
      </div>
    </div>
  )
}
