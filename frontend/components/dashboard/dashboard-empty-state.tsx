"use client"

import { EmptyState } from "@/components/ui/empty-state"
import { AddTradeDialog } from "@/components/trades/add-trade-dialog"
import { AddCashFlowDialog } from "@/components/cash-flows/add-cash-flow-dialog"

export function DashboardEmptyState() {
  return (
    <EmptyState
      title="No portfolio data yet"
      description="Add your first trade or deposit to start tracking your portfolio."
      action={
        <div className="flex flex-col gap-3 w-full md:w-auto">
          <AddTradeDialog>
            <span className="w-full md:w-auto">Add Trade</span>
          </AddTradeDialog>
          <AddCashFlowDialog>
            <span className="w-full md:w-auto">Add Cash Flow</span>
          </AddCashFlowDialog>
        </div>
      }
    />
  )
}
