"use client"

import { EmptyState } from "@/components/ui/empty-state"
import { AddTradeDialog } from "@/components/trades/add-trade-dialog"

export function PerformanceEmptyState() {
  return (
    <EmptyState
      title="No performance data yet"
      description="Add trades and cash flows to calculate returns, fees, and XIRR."
      action={
        <div className="flex flex-col gap-3 w-full md:w-auto">
          <AddTradeDialog>
            <span className="w-full md:w-auto">Add trade</span>
          </AddTradeDialog>
        </div>
      }
    />
  )
}
