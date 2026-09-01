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
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/filters/date-range-picker"
import { queryKeys } from "@/lib/api/query-keys"
import Decimal from "decimal.js"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"
import { CHART_HEIGHT_SHORT } from "@/lib/chart-sizes"
import { formatShortMonthYear, intlLocale } from "@/lib/date-utils"
import { useLocale } from "@/components/locale-provider"
import {
  EMPTY_TRADE_DATE_RANGE,
  formatTradeDateRangeLabel,
  type TradeDateRange,
} from "@/lib/trades/trade-filters"

function intervalFromRange(range: TradeDateRange): PerformanceInterval {
  if (!range.from) return "year"
  const from = new Date(range.from)
  const to = range.to ? new Date(range.to) : new Date()
  const days = (to.getTime() - from.getTime()) / 86_400_000
  if (days <= 90) return "day"
  if (days <= 365) return "week"
  return "month"
}

function formatPerfRangeLabel(range: TradeDateRange, locale: string): string {
  if (!range.from) return "All time"
  return formatTradeDateRangeLabel(range, locale)
}

function formatChartDate(date: string, locale: string): string {
  return formatShortMonthYear(date, locale)
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
  const { locale } = useLocale()
  const dateLocale = intlLocale(locale)
  const [selectedRange, setSelectedRange] = useState<TradeDateRange>(EMPTY_TRADE_DATE_RANGE)
  const interval = intervalFromRange(selectedRange)
  const isAllTime = selectedRange.from === null && selectedRange.to === null

  const { data: points = [], isLoading, error } = useQuery<PerformancePoint[]>({
    queryKey: queryKeys.performanceTimeSeries(interval),
    queryFn: () => getPerformanceTimeSeries(interval),
    retry: false,
    placeholderData: keepPreviousData,
  })

  const filtered = useMemo(() => {
    if (!selectedRange.from) return points
    return points.filter((p) => {
      if (selectedRange.from && p.date < selectedRange.from) return false
      if (selectedRange.to && p.date > selectedRange.to) return false
      return true
    })
  }, [points, selectedRange])

  const chartData = useMemo(
    () =>
      filtered.map((point) => ({
        label: formatChartDate(point.date, dateLocale),
        value: new Decimal(point.portfolio_value || "0").toNumber(),
      })),
    [filtered, dateLocale],
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
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          Your money over time
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={isAllTime ? "default" : "outline"}
            size="sm"
            className="h-8 px-2.5 text-sm"
            aria-pressed={isAllTime}
            onClick={() => setSelectedRange(EMPTY_TRADE_DATE_RANGE)}
          >
            All time
          </Button>
          <DateRangePicker
            id="perf-date-range"
            label="Date range"
            ariaLabel="Filter performance chart by date range"
            value={selectedRange}
            onChange={setSelectedRange}
            formatLabel={(range) => formatPerfRangeLabel(range, dateLocale)}
            hideLabel
            popoverAlign="end"
          />
        </div>
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