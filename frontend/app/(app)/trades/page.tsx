import { TradesList } from "@/components/trades/trades-list"
import { AddTradeDialog } from "@/components/trades/add-trade-dialog"
import { listTrades } from "@/lib/api/server-trades"

export default async function TradesPage() {
  let trades = []
  try {
    trades = await listTrades()
  } catch (error) {
    console.error("Failed to fetch trades:", error)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Trades</h1>
          <p className="text-muted-foreground">Track your buy and sell transactions</p>
        </div>
        <AddTradeDialog />
      </div>
      <TradesList trades={trades} />
    </>
  )
}
