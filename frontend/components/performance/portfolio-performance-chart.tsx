"use client"

import { useState, useMemo } from "react"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"
import { AlertCircleIcon } from "lucide-react"
import {
  getPerformanceTimeSeries,
  type PerformanceInterval,
  type PerformancePoint,
} from "@/lib/api/analytics"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { queryKeys } from "@/lib/api/query-keys"
import Decimal from "decimal.js"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"
import { CHART_HEIGHT_SHORT } from "@/lib/chart-sizes"

const INTERVAL_OPTIONS: { value: PerformanceInterval; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
]

function formatChartDate(date: string): string {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: MARKET_CONFIG.baseCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

interface ChartTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: { label: string } }>
}

function ChartTooltipContent({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const point = payload[0]
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 shadow-md text-popover-foreground">
      <p className="text-xs font-medium">{point.payload.label}</p>
      <p className="text-sm font-mono font-semibold tabular-nums">
        {formatCurrency(point.value)}
      </p>
    </div>
  )
}

export function PortfolioPerformanceChart() {
  const [interval, setInterval] = useState<PerformanceInterval>("month")

  const { data: points = [], isLoading, error } = useQuery<PerformancePoint[]>({
    queryKey: queryKeys.performanceTimeSeries(interval),
    queryFn: () => getPerformanceTimeSeries(interval),
    retry: false,
    placeholderData: keepPreviousData,
  })

  const chartData = useMemo(
    () =>
      points.map((point) => ({
        label: formatChartDate(point.date),
        value: new Decimal(point.portfolio_value || "0").toNumber(),
      })),
    [points],
  )

  const isPositiveTrend = useMemo(() => {
    if (chartData.length < 2) return true
    return chartData[chartData.length - 1].value >= chartData[0].value
  }, [chartData])

  const chartColor = isPositiveTrend ? "var(--success)" : "var(--destructive)"
  const gradientId = "perfChartGradient"

  const showInitialSkeleton = isLoading && points.length === 0

  if (showInitialSkeleton) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className={`${CHART_HEIGHT_SHORT} w-full`} />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Your money over time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-[260px] md:min-h-[320px] flex-col items-center justify-center text-muted-foreground">
            <AlertCircleIcon className="mb-3 h-10 w-10 opacity-40" />
            <p className="font-medium">Unable to load performance history</p>
            <p className="mt-1 text-sm">Try refreshing the page or check back later.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          Your money over time
        </CardTitle>
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
        {chartData.length < 2 ? (
          <div className="flex min-h-[260px] md:min-h-[320px] flex-col items-center justify-center text-muted-foreground">
            <AlertCircleIcon className="mb-3 h-10 w-10 opacity-40" />
            <p className="font-medium">No performance data yet</p>
            <p className="mt-1 text-sm">Add trades and cash flows to see your money over time.</p>
          </div>
        ) : (
          <div className={`${CHART_HEIGHT_SHORT} w-full`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
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
                  dataKey="label"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  interval="preserveStartEnd"
                />
                <YAxis
                  hide
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  cursor={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.4, strokeDasharray: 3 }}
                  content={<ChartTooltipContent />}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={chartColor}
                  strokeWidth={2.5}
                  fill={`url(#${gradientId})`}
                  dot={false}
                  activeDot={{ r: 4, fill: chartColor, stroke: "var(--background)", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}