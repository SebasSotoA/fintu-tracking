"use client"

import { useState } from "react"
import type { Holding } from "@/lib/types"
import { HoldingsTable } from "@/components/dashboard/holdings-table"
import { AddTradeDialog } from "@/components/trades/add-trade-dialog"
import type { PageSize } from "@/lib/pagination/table-pagination"

interface DashboardQuickTradeProps {
  holdings: Holding[]
  total: number
  page: number
  pageSize: PageSize
  priceUpdatedAtByTicker?: Record<string, string | null>
  lastPriceRefreshAt?: string | null
}

interface QuickTradeTarget {
  ticker: string
  assetType: "stock" | "etf" | "crypto"
}

export function DashboardQuickTrade({
  holdings,
  total,
  page,
  pageSize,
  priceUpdatedAtByTicker,
  lastPriceRefreshAt,
}: DashboardQuickTradeProps) {
  const [target, setTarget] = useState<QuickTradeTarget | null>(null)

  return (
    <>
      <HoldingsTable
        holdings={holdings}
        total={total}
        page={page}
        pageSize={pageSize}
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
