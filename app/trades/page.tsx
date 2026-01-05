import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppNav } from "@/components/layout/app-nav"
import { TradesList } from "@/components/trades/trades-list"
import { AddTradeDialog } from "@/components/trades/add-trade-dialog"

export default async function TradesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: trades, error } = await supabase
    .from("trades")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })

  if (error) {
    console.error("Error fetching trades:", error)
  }

  return (
    <div className="min-h-screen">
      <AppNav />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Trades</h1>
            <p className="text-muted-foreground">Track your buy and sell transactions</p>
          </div>
          <AddTradeDialog />
        </div>
        <TradesList trades={trades || []} />
      </div>
    </div>
  )
}
