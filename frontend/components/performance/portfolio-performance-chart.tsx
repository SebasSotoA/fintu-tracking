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
import { formatCurrency } from "@/lib/decimal"
import Decimal from "decimal.js"

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
  }))
}

function ChartHeaderLegend() {
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
    </div>
  )
}

export function PortfolioPerformanceChart() {
  const [interval, setInterval] = useState<PerformanceInterval>("month")

  const { data: points = [], isLoading, error } = useQuery({
    queryKey: ["performance-time-series", interval],
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
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Portfolio vs invested
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  const chartData = toChartData(points)

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Portfolio vs invested
          </CardTitle>
          <ChartHeaderLegend />
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
                    formatter={(value) => (
                      <span className="font-mono font-medium tabular-nums text-foreground">
                        {formatCurrency(String(value), "USD")}
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
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
