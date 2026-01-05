import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppNav } from "@/components/layout/app-nav"
import { PortfolioSummary } from "@/components/dashboard/portfolio-summary"
import { HoldingsTable } from "@/components/dashboard/holdings-table"
import { calculateHoldings, updateHoldingsWithPrices } from "@/lib/portfolio"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch all user data
  const { data: trades } = await supabase
    .from("trades")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: true })

  const { data: cashFlows } = await supabase
    .from("cash_flows")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })

  const { data: fxRates } = await supabase
    .from("fx_rates")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(1)

  const { data: marketPrices } = await supabase.from("market_prices").select("*")

  // Calculate holdings
  const holdings = calculateHoldings(trades || [])
  const pricesMap = new Map((marketPrices || []).map((p) => [p.ticker, p.price]))
  const holdingsWithPrices = updateHoldingsWithPrices(holdings, pricesMap)

  const latestFxRate = fxRates && fxRates.length > 0 ? fxRates[0].rate : null

  return (
    <div className="min-h-screen">
      <AppNav />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Your portfolio at a glance</p>
        </div>
        <PortfolioSummary
          holdings={Array.from(holdingsWithPrices.values())}
          cashFlows={cashFlows || []}
          latestFxRate={latestFxRate}
        />
        <div className="mt-8">
          <HoldingsTable holdings={Array.from(holdingsWithPrices.values())} />
        </div>
      </div>
    </div>
  )
}
