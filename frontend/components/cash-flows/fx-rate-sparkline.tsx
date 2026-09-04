"use client"

import type { FxRateChartPoint } from "@/lib/api/fx-rates"
import { formatTooltipDate, formatShortMonthDay, intlLocale } from "@/lib/date-utils"
import { Decimal } from "@/lib/decimal"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"
import { useLocale } from "@/components/locale-provider"
import { ChartPanelSkeleton } from "@/components/ui/chart-panel-skeleton"
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export { formatTooltipDate } from "@/lib/date-utils"

interface FxRateSparklineProps {
  points: FxRateChartPoint[]
  isLoading?: boolean
}

type ChartPoint = {
  dateKey: string
  label: string
  rate: number
}

function formatRate(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function computeTicks(data: ChartPoint[], maxTicks = 6): string[] {
  if (data.length <= maxTicks) return data.map((d) => d.dateKey)
  const step = Math.floor((data.length - 1) / (maxTicks - 1))
  const ticks = Array.from({ length: maxTicks - 1 }, (_, i) => data[i * step].dateKey)
  ticks.push(data[data.length - 1].dateKey)
  return ticks
}

export function formatAxisDateKey(dateKey: string, locale: string = "en-US"): string {
  return formatShortMonthDay(dateKey, locale)
}

/** Recharts calls this per point; only the last (current) point is marked. */
function CurrentRateDot(
  props: { cx?: number; cy?: number; index?: number },
  lastIndex: number,
) {
  const { cx, cy, index } = props
  if (cx == null || cy == null || index == null) return <g />
  if (index !== lastIndex) return <g key={index} />

  return (
    <g key={index} aria-hidden="true">
      <circle cx={cx} cy={cy} r={3} fill="var(--primary)" />
    </g>
  )
}

function FxRateTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: ChartPoint }[]
}) {
  const { locale } = useLocale()
  if (!active || !payload?.length) return null

  const { rate, dateKey } = payload[0].payload
  const datePart = formatTooltipDate(dateKey, intlLocale(locale))

  return (
    <div
      className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs shadow-sm"
      role="status"
    >
      <p className="font-medium tabular-nums text-foreground">
        {formatRate(rate)} {MARKET_CONFIG.localCurrency} {datePart}
      </p>
    </div>
  )
}

export function FxRateSparkline({ points, isLoading = false }: FxRateSparklineProps) {
  const { locale, t } = useLocale()
  const axisLocale = intlLocale(locale)

  if (isLoading) {
    return (
      <div
        className="rounded-xl border border-border/50 bg-muted/20"
        role="status"
        aria-busy="true"
        aria-label={t("cash.loadingChart")}
      >
        <ChartPanelSkeleton height="sparkline" withCard={false} nested />
      </div>
    )
  }

  const data = (points || [])
    .map((p) => {
      const rate = new Decimal(p.rate)
      if (!rate.isFinite() || rate.lte(0)) return null
      const date = new Date(`${p.date}T12:00:00`)
      return {
        dateKey: p.date,
        label: Number.isNaN(date.getTime()) ? p.date : formatAxisDateKey(p.date, axisLocale),
        rate: rate.toNumber(),
      }
    })
    .filter((row): row is ChartPoint => row !== null)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))

  if (data.length === 0) {
    return (
      <div className="flex h-[140px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
        {t("cash.noChartData")}
      </div>
    )
  }

  const rates = data.map((d) => d.rate)
  const min = Math.min(...rates)
  const max = Math.max(...rates)
  const padding = Math.max((max - min) * 0.15, 20)
  const currentRate = data[data.length - 1]?.rate
  const lastIndex = data.length - 1
  const xTicks = computeTicks(data)

  return (
    <div className="h-[140px] w-full [&_.recharts-wrapper]:overflow-visible [&_.recharts-surface]:overflow-visible [&_svg]:overflow-visible">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 16 }}>
          <defs>
            <linearGradient id="fxRateGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.32} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="dateKey"
            ticks={xTicks}
            interval={0}
            tickFormatter={(dateKey) => formatAxisDateKey(dateKey, axisLocale)}
            padding={{ right: 16 }}
            tick={{ fontSize: 10, fill: "var(--foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            width={72}
            domain={[min - padding, max + padding]}
            tickCount={4}
            tick={{ fontSize: 10, fill: "var(--foreground)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => (typeof v === "number" ? formatRate(v) : String(v))}
          />
          {currentRate != null && (
            <ReferenceLine
              y={currentRate}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 3"
              strokeOpacity={0.5}
              strokeWidth={1}
            />
          )}
          <Tooltip content={<FxRateTooltip />} cursor={{ stroke: "var(--border)", strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="rate"
            stroke="var(--primary)"
            strokeWidth={2.5}
            fill="url(#fxRateGradient)"
            isAnimationActive={false}
            dot={(dotProps) => CurrentRateDot(dotProps, lastIndex)}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
