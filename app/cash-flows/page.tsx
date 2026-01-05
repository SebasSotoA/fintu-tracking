import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppNav } from "@/components/layout/app-nav"
import { CashFlowsList } from "@/components/cash-flows/cash-flows-list"
import { AddCashFlowDialog } from "@/components/cash-flows/add-cash-flow-dialog"
import { FxRateManager } from "@/components/cash-flows/fx-rate-manager"

export default async function CashFlowsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: cashFlows, error } = await supabase
    .from("cash_flows")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })

  const { data: fxRates } = await supabase
    .from("fx_rates")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(10)

  if (error) {
    console.error("Error fetching cash flows:", error)
  }

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
            <FxRateManager recentRates={fxRates || []} />
            <AddCashFlowDialog />
          </div>
        </div>
        <CashFlowsList cashFlows={cashFlows || []} />
      </div>
    </div>
  )
}
