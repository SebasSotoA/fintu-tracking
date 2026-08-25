"use client"

import { useState, useMemo } from "react"
import type React from "react"
import { useQuery } from "@tanstack/react-query"
import Decimal from "decimal.js"
import { TrendingUp, TrendingDown } from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { api } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import type { NetWorthData } from "@/lib/types"
import type { PerformancePoint, PerformanceInterval } from "@/lib/api/analytics"
import { getPerformanceTimeSeries } from "@/lib/api/analytics"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"
import { MetricLabel } from "@/components/analytics/metric-primitives"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TimePeriodSelector, type TimePeriod } from "@/components/dashboard/time-period-selector"
import { NetWorthCardSkeleton } from "@/components/dashboard/dashboard-card-skeleton"

interface NetWorthCardProps {
  initialData?: NetWorthData | null
}

export const METRIC_TOOLTIPS = {
  portfolioTotal:
    `Total portfolio value: current market value of holdings plus available buy power in ${MARKET_CONFIG.baseCurrency}.`,
  cash: `Uninvested ${MARKET_CONFIG.baseCurrency} available to buy (poder de compra): deposits − withdrawals − transfer fees − money spent on buys + sell proceeds.`,
  unrealizedProxy:
    "Proxy badge based on total gain/loss from analytics. Detailed XIRR and attribution stay in Performance.",
} as const

function formatBaseCurrency(value: Decimal | number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: MARKET_CONFIG.baseCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(typeof value === "number" ? value : value.toNumber())
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatLongDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

interface ChartTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: { date: string } }>
}

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const point = payload[0]
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 shadow-md text-popover-foreground">
      <p className="text-xs font-medium">{formatLongDate(point.payload.date)}</p>
      <p className="text-sm font-mono tabular-nums font-semibold">
        {formatBaseCurrency(point.value)}
      </p>
    </div>
  )
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
      const d = new Date(now); d.setFullYear(now.getFullYear() - 1)
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
  })

  const trendData = useMemo(() => {
    if (!timeSeries) return []
    return timeSeries.map((pt) => ({
      date: pt.date,
      value: Number(pt.portfolio_value),
    }))
  }, [timeSeries])

  if (isLoading) {
    return <NetWorthCardSkeleton />
  }

  if (error || !netWorth) {
    return (
      <Card className="border-destructive">
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
  const gainLoss = new Decimal(netWorth.total_gain_loss || "0")
  const gainLossPct = new Decimal(netWorth.total_gain_loss_pct || "0")

  // Prefer the canonical gain/loss percentage from net-worth; fall back to a
  // first-vs-last ratio from the time series only when there are enough points
  // and the first point is meaningfully non-zero.
  const trendPct = !gainLossPct.isZero()
    ? gainLossPct.toNumber()
    : trendData.length >= 3 && trendData[0].value > 0
      ? ((trendData[trendData.length - 1].value - trendData[0].value) /
          trendData[0].value) *
        100
      : null

  const showChart = trendData.length >= 2
  const showTrend = (showChart || !gainLoss.isZero()) && trendPct !== null
  const isTrendPositive = trendPct !== null && trendPct >= 0
  const chartColor = isTrendPositive ? "var(--success)" : "var(--destructive)"

  const firstDate = trendData.length > 0 ? trendData[0].date : null
  const lastDate = trendData.length > 0 ? trendData[trendData.length - 1].date : null

  return (
    <Card className="h-full">
      <CardContent className="flex flex-col gap-4 py-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <MetricLabel label="Portfolio total" tooltip={METRIC_TOOLTIPS.portfolioTotal} />
          <TimePeriodSelector value={period} onChange={setPeriod} />
        </div>
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="text-3xl font-bold font-mono tracking-tight tabular-nums md:text-4xl">
            {formatBaseCurrency(portfolioTotal)}
          </h2>
          {showTrend && (
            <div className="flex items-center gap-1">
              {isTrendPositive ? (
                <TrendingUp className="h-4 w-4 text-success" aria-hidden />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" aria-hidden />
              )}
              <span
                className={`text-sm font-mono font-semibold ${
                  isTrendPositive ? "text-success" : "text-destructive"
                }`}
              >
                {(trendPct ?? 0) >= 0 ? "+" : ""}
                {(trendPct ?? 0).toFixed(2)}%
              </span>
            </div>
          )}
        </div>
        {showChart ? (
          <div className="space-y-1 flex-1 flex flex-col min-h-0">
            <div className="flex-1 min-h-[128px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trendData}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="nwTrendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartColor} stopOpacity={0.32} />
                      <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--border)"
                    strokeOpacity={0.4}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatShortDate}
                    minTickGap={32}
                    interval="preserveStartEnd"
                  />
                  <YAxis hide domain={["auto", "auto"]} />
                  <Tooltip
                    cursor={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.4, strokeDasharray: 3 }}
                    content={<ChartTooltip />}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={chartColor}
                    strokeWidth={2}
                    fill="url(#nwTrendGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: chartColor, stroke: "var(--background)", strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {firstDate && lastDate && firstDate !== lastDate && (
              <p
                className="text-[10px] uppercase tracking-widest text-muted-foreground"
                data-testid="net-worth-timeframe"
              >
                {formatLongDate(firstDate)} — {formatLongDate(lastDate)}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Refresh prices to see history.
          </p>
        )}
        {/* gainLoss/gainLossPct remain available for tests and future badges. */}
        <span className="hidden" data-testid="net-worth-gain-loss">
          {formatBaseCurrency(gainLoss)}
        </span>
      </CardContent>
    </Card>
  )
}