"use client"

import { useQuery } from "@tanstack/react-query"
import Decimal from "decimal.js"
import { KpiTile } from "@/components/dashboard/kpi-tile"
import { apiClient } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"
import type { NetWorthData } from "@/lib/types"

function formatCurrency(
  value: Decimal,
  currency: string = MARKET_CONFIG.baseCurrency,
): string {
  const decimals = currency === MARKET_CONFIG.localCurrency ? 0 : 2
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value.toNumber())
}

interface KpiStripProps {
  initialData?: NetWorthData | null
}

export function KpiStrip({ initialData }: KpiStripProps) {
  const { data, isLoading } = useQuery<NetWorthData>({
    queryKey: queryKeys.netWorth(),
    queryFn: () => apiClient.get<NetWorthData>("/api/analytics/net-worth"),
    initialData: initialData ?? undefined,
    staleTime: 60_000,
    refetchInterval: 60_000,
  })

  if (isLoading || !data) {
    return (
      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4"
        data-testid="kpi-strip"
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <KpiTile key={i} label="" value="—" />
        ))}
      </div>
    )
  }

  const buyPower = new Decimal(data.cash_balance || "0")
  const totalInvested = new Decimal(data.total_invested || "0")
  const gainLoss = new Decimal(data.total_gain_loss || "0")
  const gainLossPct = new Decimal(data.total_gain_loss_pct || "0")

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4"
      data-testid="kpi-strip"
    >
      <KpiTile
        label="Total Return"
        value={formatCurrency(gainLoss)}
        trendPct={gainLossPct.toNumber()}
        caption={gainLossPct.isZero() ? "No change" : "vs invested"}
      />
      <KpiTile
        label="Total Invested"
        value={formatCurrency(totalInvested)}
        caption="Capital deployed"
      />
      <KpiTile
        label="Buy Power"
        value={formatCurrency(buyPower)}
        caption="Available to invest"
      />
    </div>
  )
}