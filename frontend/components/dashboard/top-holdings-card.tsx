"use client"

import Link from "next/link"
import type { Holding } from "@/lib/types"
import { Decimal, formatCurrency } from "@/lib/decimal"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TickerLogo } from "@/components/ui/ticker-logo"

interface TopHoldingsCardProps {
  holdings: Holding[]
  totalPortfolioValue: number
  limit?: number
}

const ASSET_LABEL: Record<string, string> = {
  stock: "Stock",
  etf: "ETF",
  crypto: "Crypto",
}

function formatMoney(value: string): string {
  return formatCurrency(value, MARKET_CONFIG.baseCurrency)
}

export function TopHoldingsCard({
  holdings,
  totalPortfolioValue,
  limit = 5,
}: TopHoldingsCardProps) {
  const top = [...holdings]
    .sort((a, b) => new Decimal(b.marketValue).comparedTo(new Decimal(a.marketValue)))
    .slice(0, limit)

  if (top.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top Holdings</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center text-sm text-muted-foreground py-12">
          No holdings yet.
        </CardContent>
      </Card>
    )
  }

  const total = new Decimal(totalPortfolioValue || 0)

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Top Holdings</CardTitle>
          <Link href="/trades" className="text-xs text-muted-foreground hover:text-foreground">
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent className="px-2 py-2">
        <ul className="divide-y divide-white/5">
          {top.map((holding) => {
            const marketValue = new Decimal(holding.marketValue || 0)
            const pct = total.isZero()
              ? 0
              : marketValue.div(total).mul(100).toNumber()
            const assetLabel = ASSET_LABEL[holding.assetType ?? ""] ?? "Asset"
            return (
              <li key={holding.ticker} className="flex items-center gap-2.5 py-2 px-3">
                <TickerLogo
                  ticker={holding.ticker}
                  assetType={holding.assetType ?? null}
                  size={28}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{holding.ticker}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{assetLabel}</p>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <span className="text-sm font-mono font-semibold tabular-nums text-foreground">
                    {formatMoney(holding.marketValue)}
                  </span>
                  <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}