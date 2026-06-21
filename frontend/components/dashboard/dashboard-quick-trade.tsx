"use client"

import { useState } from "react"
import type { Holding } from "@/lib/types"
import { HoldingsTable } from "@/components/dashboard/holdings-table"
import { AddTradeDialog } from "@/components/trades/add-trade-dialog"

interface DashboardQuickTradeProps {
  holdings: Holding[]
  priceUpdatedAtByTicker?: Record<string, string | null>
  lastPriceRefreshAt?: string | null
}

interface QuickTradeTarget {
  ticker: string
  assetType: "stock" | "etf" | "crypto"
}

export function DashboardQuickTrade({
  holdings,
  priceUpdatedAtByTicker,
  lastPriceRefreshAt,
}: DashboardQuickTradeProps) {
  const [target, setTarget] = useState<QuickTradeTarget | null>(null)

  return (
    <>
      <HoldingsTable
        holdings={holdings}
        priceUpdatedAtByTicker={priceUpdatedAtByTicker}
        lastPriceRefreshAt={lastPriceRefreshAt}
        onQuickTrade={(ticker, assetType) => {
          setTarget({ ticker, assetType: assetType as "stock" | "etf" | "crypto" })
        }}
      />
      {target && (
        <AddTradeDialog
          key={`${target.ticker}-${target.assetType}`}
          initialTicker={target.ticker}
          initialAssetType={target.assetType}
          initialSide="buy"
          autoOpen
        />
      )}
    </>
  )
}
