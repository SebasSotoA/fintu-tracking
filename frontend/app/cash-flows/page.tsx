import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppNav } from "@/components/layout/app-nav"
import { CashFlowsList } from "@/components/cash-flows/cash-flows-list"
import { AddCashFlowDialog } from "@/components/cash-flows/add-cash-flow-dialog"
import { FxRateManager } from "@/components/cash-flows/fx-rate-manager"
import { listCashFlows } from "@/lib/api/server-cash-flows"
import { listFxRates } from "@/lib/api/server-fx-rates"

export default async function CashFlowsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch data from API with error handling
  let cashFlows = []
  let fxRates = []

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

  const recentFxRates = fxRates.slice(0, 10)

  return (
    <div className="min-h-screen">
      <AppNav />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Cash Flows</h1>
            <p className="text-muted-foreground">Track deposits, withdrawals, and fees</p>
          </div>
          <div className="flex gap-3">
            <FxRateManager recentRates={recentFxRates} />
            <AddCashFlowDialog />
          </div>
        </div>
        <CashFlowsList cashFlows={cashFlows} />
      </div>
    </div>
  )
}
