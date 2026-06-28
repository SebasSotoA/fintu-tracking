"use client"

import { useState } from "react"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { AlertCircleIcon } from "lucide-react"
import {
  getPerformanceTimeSeries,
  type PerformanceInterval,
  type PerformancePoint,
} from "@/lib/api/analytics"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { queryKeys } from "@/lib/api/query-keys"
import { formatCurrency } from "@/lib/decimal"
import Decimal from "decimal.js"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"

const INTERVAL_OPTIONS: { value: PerformanceInterval; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
]

const chartConfig = {
  portfolio_value: {
    label: "Portfolio value",
    color: "var(--chart-1)",
  },
  invested_capital: {
    label: "Invested capital",
    color: "var(--chart-2)",
  },
  spy_indexed: {
    label: "SPY (indexed)",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig

const TOOLTIP_CLASS =
  "border-border bg-popover text-popover-foreground shadow-md"

function formatChartDate(date: string): string {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

function toChartData(points: PerformancePoint[]) {
  return points.map((point) => ({
    date: point.date,
    label: formatChartDate(point.date),
    portfolio_value: new Decimal(point.portfolio_value || "0").toNumber(),
    invested_capital: new Decimal(point.invested_capital || "0").toNumber(),
    spy_indexed: point.spy_indexed
      ? new Decimal(point.spy_indexed).toNumber()
      : null,
  }))
}

function hasSpySeries(points: PerformancePoint[]): boolean {
  return points.some((p) => p.spy_indexed && p.spy_indexed !== "")
}

function ChartHeaderLegend({ showSpy }: { showSpy: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span
          className="h-2 w-2 shrink-0 rounded-[2px]"
          style={{ backgroundColor: "var(--chart-1)" }}
          aria-hidden
        />
        Portfolio value
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="h-2 w-2 shrink-0 rounded-[2px] border border-dashed border-[var(--chart-2)] bg-transparent"
          aria-hidden
        />
        Invested capital
      </span>
      {showSpy ? (
        <span className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 shrink-0 rounded-[2px]"
            style={{ backgroundColor: "var(--chart-4)" }}
            aria-hidden
          />
          SPY (indexed)
        </span>
      ) : null}
    </div>
  )
}

export function PortfolioPerformanceChart() {
  const [interval, setInterval] = useState<PerformanceInterval>("month")

  const { data: points = [], isLoading, error } = useQuery({
    queryKey: queryKeys.performanceTimeSeries(interval),
    queryFn: () => getPerformanceTimeSeries(interval),
    retry: false,
    placeholderData: keepPreviousData,
  })

  const showInitialSkeleton = isLoading && points.length === 0

  if (showInitialSkeleton) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[320px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Portfolio vs invested
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-[320px] flex-col items-center justify-center text-muted-foreground">
            <AlertCircleIcon className="mb-3 h-10 w-10 opacity-40" />
            <p className="font-medium">Unable to load performance history</p>
            <p className="mt-1 text-sm">Try refreshing the page or check back later.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = toChartData(points)
  const showSpy = hasSpySeries(points)

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Portfolio vs invested
          </CardTitle>
          <ChartHeaderLegend showSpy={showSpy} />
        </div>
        <ToggleGroup
          type="single"
          value={interval}
          onValueChange={(value) => {
            if (value) setInterval(value as PerformanceInterval)
          }}
          variant="outline"
          size="sm"
          aria-label="Performance interval"
        >
          {INTERVAL_OPTIONS.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value} aria-label={option.label}>
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center text-muted-foreground">
            <AlertCircleIcon className="mb-3 h-10 w-10 opacity-40" />
            <p className="font-medium">No performance history yet</p>
            <p className="mt-1 text-sm">Add trades or cash flows to see portfolio value over time.</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[320px] w-full aspect-auto">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--muted-foreground)" strokeOpacity={0.1} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                stroke="var(--muted-foreground)"
                strokeOpacity={0.3}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                stroke="var(--muted-foreground)"
                strokeOpacity={0.3}
                tickFormatter={(value: number) =>
                  new Intl.NumberFormat("en-US", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(value)
                }
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className={TOOLTIP_CLASS}
                    labelFormatter={(_, payload) => {
                      const item = payload?.[0]?.payload as { label?: string } | undefined
                      return item?.label ?? ""
                    }}
                    formatter={(value, name) => (
                      <span className="font-mono font-medium tabular-nums text-foreground">
                        {name === "spy_indexed"
                          ? Number(value).toFixed(2)
                          : formatCurrency(String(value), MARKET_CONFIG.baseCurrency)}
                      </span>
                    )}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="portfolio_value"
                stroke="var(--color-portfolio_value)"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="invested_capital"
                stroke="var(--color-invested_capital)"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
              />
              {showSpy ? (
                <Line
                  type="monotone"
                  dataKey="spy_indexed"
                  stroke="var(--color-spy_indexed)"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ) : null}
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
