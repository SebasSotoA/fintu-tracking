import { TradesList } from "@/components/trades/trades-list"
import { AddTradeDialog } from "@/components/trades/add-trade-dialog"
import { listTrades } from "@/lib/api/server-trades"
import type { Trade } from "@/lib/types"

export default async function TradesPage() {
  let trades: Trade[] = []
  try {
    trades = await listTrades()
  } catch (error) {
    console.error("Failed to fetch trades:", error)
  }

  return (
    <>
      <div className="flex justify-end mb-8">
        <AddTradeDialog />
      </div>
      <TradesList trades={trades} />
    </>
  )
}
