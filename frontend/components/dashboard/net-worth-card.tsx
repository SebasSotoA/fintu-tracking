"use client"

import { useState, useMemo } from "react"
import type React from "react"
import { useQuery } from "@tanstack/react-query"
import Decimal from "decimal.js"
import { TrendingUp, TrendingDown } from "lucide-react"
import { Area, AreaChart, ResponsiveContainer } from "recharts"
import { api } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import type { NetWorthData } from "@/lib/types"
import type { PerformancePoint, PerformanceInterval } from "@/lib/api/analytics"
import { getPerformanceTimeSeries } from "@/lib/api/analytics"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"
import { MetricLabel } from "@/components/analytics/metric-primitives"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TimePeriodSelector, type TimePeriod } from "@/components/dashboard/time-period-selector"
import { PortfolioHealthBanner } from "@/components/dashboard/portfolio-health-banner"
import { NetWorthCardSkeleton } from "@/components/dashboard/dashboard-card-skeleton"

interface NetWorthCardProps {
  initialData?: NetWorthData | null
}

export const METRIC_TOOLTIPS = {
  portfolioTotal:
    `Total portfolio value: current market value of holdings plus available buy power in ${MARKET_CONFIG.baseCurrency}.`,
  cash:
    `Uninvested ${MARKET_CONFIG.baseCurrency} available to buy (poder de compra): deposits − withdrawals − transfer fees − money spent on buys + sell proceeds.`,
  unrealizedProxy:
    "Proxy badge based on total gain/loss from analytics. Detailed XIRR and attribution stay in Performance.",
} as const

function formatBaseCurrency(value: Decimal): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: MARKET_CONFIG.baseCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value.toNumber())
}

function getPeriodConfig(period: TimePeriod): { interval: PerformanceInterval; startDate: string | undefined } {
  const now = new Date()
  switch (period) {
    case "1M": {
      const d = new Date(now); d.setMonth(d.getMonth() - 1)
      return { interval: "day", startDate: d.toISOString().split("T")[0] }
    }
    case "3M": {
      const d = new Date(now); d.setMonth(d.getMonth() - 3)
      return { interval: "week", startDate: d.toISOString().split("T")[0] }
    }
    case "YTD": {
      const d = new Date(now.getFullYear(), 0, 1)
      return { interval: "month", startDate: d.toISOString().split("T")[0] }
    }
    case "1Y": {
      const d = new Date(now); d.setFullYear(d.getFullYear() - 1)
      return { interval: "month", startDate: d.toISOString().split("T")[0] }
    }
    case "ALL":
      return { interval: "year", startDate: undefined }
  }
}

export function NetWorthCard({ initialData }: NetWorthCardProps): React.JSX.Element {
  const [period, setPeriod] = useState<TimePeriod>("ALL")

  const { data: netWorth, isLoading, error } = useQuery<NetWorthData>({
    queryKey: queryKeys.netWorth(),
    queryFn: () => api.get<NetWorthData>("/api/analytics/net-worth"),
    initialData: initialData ?? undefined,
    staleTime: 60_000,
    refetchInterval: 60_000,
  })

  const { interval, startDate } = getPeriodConfig(period)

  const { data: timeSeries } = useQuery<PerformancePoint[]>({
    queryKey: ["performance-time-series", "net-worth-mini", interval, startDate],
    queryFn: () => getPerformanceTimeSeries(interval),
    staleTime: 120_000,
    enabled: period !== "ALL",
  })

  const trend = useMemo(() => {
    if (period === "ALL" || !timeSeries?.length) return null
    const first = new Decimal(timeSeries[0].portfolio_value)
    const last = new Decimal(timeSeries[timeSeries.length - 1].portfolio_value)
    if (first.isZero()) return null
    return last.sub(first).div(first).mul(100)
  }, [timeSeries, period])

  const trendData = useMemo(() => {
    if (!timeSeries) return []
    return timeSeries.map((pt) => ({
      date: pt.date,
      value: Number(pt.portfolio_value),
    }))
  }, [timeSeries])

  const isTrendPositive = trend && trend.gte(0)
  const chartColor = isTrendPositive ? "var(--primary)" : "var(--destructive)"

  if (isLoading) {
    return <NetWorthCardSkeleton />
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
    <Card variant="kpi" className="col-span-full h-full">
      <CardContent className="flex flex-col flex-1 gap-4 pt-6">
        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <MetricLabel label="Portfolio total" tooltip={METRIC_TOOLTIPS.portfolioTotal} />
            <TimePeriodSelector value={period} onChange={setPeriod} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-4xl font-bold font-mono tracking-tight tabular-nums md:text-5xl">
              {formatBaseCurrency(portfolioTotal)}
            </h2>
            {showUnrealizedProxyBadge && (
              <Badge variant={isPositive ? "default" : "destructive"} className="px-3 py-1 text-sm tabular-nums">
                Unrealized P/L proxy: {formatBaseCurrency(gainLoss)} ({gainLossPct.toFixed(2)}%)
              </Badge>
            )}
          </div>
        </section>

        {/* Mini trend for selected period */}
        {period !== "ALL" && trend !== null && trendData.length > 1 && (
          <section className="flex items-end gap-3">
            <ResponsiveContainer width="70%" height={48}>
              <AreaChart data={trendData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="nwTrendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColor} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={chartColor}
                  strokeWidth={2}
                  fill="url(#nwTrendGradient)"
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-1 shrink-0">
              {isTrendPositive ? (
                <TrendingUp className="h-4 w-4 text-primary" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span className={`text-sm font-mono font-semibold ${isTrendPositive ? "text-primary" : "text-destructive"}`}>
                {isTrendPositive ? "+" : ""}{trend.toFixed(1)}%
              </span>
            </div>
          </section>
        )}

        <section className="space-y-2 border-t border-border/50 pt-4">
          <MetricLabel label="Buy power" tooltip={METRIC_TOOLTIPS.cash} />
          <p className="text-2xl font-semibold font-mono tabular-nums">{formatBaseCurrency(buyPower)}</p>
          <p className="text-xs text-muted-foreground">
            XIRR and detailed return attribution are available on the Performance page.
          </p>
        </section>

        <section className="space-y-3 border-t border-border/50 pt-4">
          <h3 className="text-sm font-medium">Notifications</h3>
          <PortfolioHealthBanner />
        </section>
      </CardContent>
    </Card>
  )
}
