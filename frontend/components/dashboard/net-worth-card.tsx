"use client"

import type React from "react"
import { useQuery } from "@tanstack/react-query"
import Decimal from "decimal.js"
import { api } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import type { NetWorthData } from "@/lib/types"
import { MetricLabel } from "@/components/analytics/metric-primitives"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface NetWorthCardProps {
  initialData?: NetWorthData | null
}

export const METRIC_TOOLTIPS = {
  portfolioTotal:
    "Total portfolio value: current market value of holdings plus available buy power in USD.",
  cash:
    "Uninvested USD available to buy (poder de compra on Hapi): deposits − withdrawals − transfer fees − money spent on buys + sell proceeds.",
  unrealizedProxy:
    "Proxy badge based on total gain/loss from analytics. Detailed XIRR and attribution stay in Performance.",
} as const

function formatUsd(value: Decimal): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value.toNumber())
}

export function NetWorthCard({ initialData }: NetWorthCardProps): React.JSX.Element {
  const { data: netWorth, isLoading, error } = useQuery<NetWorthData>({
    queryKey: queryKeys.netWorth(),
    queryFn: () => api.get<NetWorthData>("/api/analytics/net-worth"),
    initialData: initialData ?? undefined,
    staleTime: 60_000,
    refetchInterval: 60_000,
  })

  if (isLoading) {
    return (
      <Card variant="kpi" className="col-span-full">
        <CardContent className="space-y-4 pt-6">
          <Skeleton className="h-16 w-72" />
          <Skeleton className="h-10 w-64" />
        </CardContent>
      </Card>
    )
  }

  if (error || !netWorth) {
    return (
      <Card className="col-span-full border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Net Worth</CardTitle>
          <CardDescription>
            Failed to load your portfolio data. Please try refreshing the page.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const portfolioTotal = new Decimal(netWorth.net_worth || "0")
  const buyPower = new Decimal(netWorth.cash_balance || "0")
  const gainLoss = new Decimal(netWorth.total_gain_loss || "0")
  const gainLossPct = new Decimal(netWorth.total_gain_loss_pct || "0")
  const isPositive = gainLoss.greaterThanOrEqualTo(0)
  const showUnrealizedProxyBadge = !gainLoss.isZero()

  return (
    <Card variant="kpi" className="col-span-full">
      <CardContent className="space-y-4 pt-6">
        <section className="space-y-2">
          <MetricLabel label="Portfolio total" tooltip={METRIC_TOOLTIPS.portfolioTotal} />
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-4xl font-bold font-mono tracking-tight tabular-nums md:text-5xl">
              {formatUsd(portfolioTotal)}
            </h2>
            {showUnrealizedProxyBadge && (
              <Badge variant={isPositive ? "default" : "destructive"} className="px-3 py-1 text-sm tabular-nums">
                Unrealized P/L proxy: {formatUsd(gainLoss)} ({gainLossPct.toFixed(2)}%)
              </Badge>
            )}
          </div>
        </section>
        <section className="rounded-lg border border-border/50 bg-muted/30 p-4">
          <MetricLabel label="Buy power" tooltip={METRIC_TOOLTIPS.cash} className="mb-2" />
          <p className="text-2xl font-semibold font-mono tabular-nums">{formatUsd(buyPower)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            XIRR and detailed return attribution are available on the Performance page.
          </p>
        </section>
      </CardContent>
    </Card>
  )
}
