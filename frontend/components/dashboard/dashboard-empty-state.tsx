"use client"

import { EmptyState } from "@/components/ui/empty-state"
import { AddTradeDialog } from "@/components/trades/add-trade-dialog"

export function DashboardEmptyState() {
  return (
    <EmptyState
      title="No portfolio data yet"
      description="Add your first trade or import your history to start tracking."
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
