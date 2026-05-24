"use client"

import type { FxRateChartPoint } from "@/lib/api/fx-rates"
import { Decimal } from "@/lib/decimal"
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

interface FxRateSparklineProps {
  points: FxRateChartPoint[]
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

/** Recharts calls this per point; only the last (current) point gets the pulsing halo. */
function CurrentRateDot(
  props: { cx?: number; cy?: number; index?: number },
  lastIndex: number,
) {
  const { cx, cy, index } = props
  if (cx == null || cy == null || index == null) return null
  if (index !== lastIndex) return <g key={index} />

  return (
    <g key={index} aria-hidden="true">
      <circle cx={cx} cy={cy} r={4} fill="var(--primary)" fillOpacity={0.3}>
        <animate attributeName="r" values="4;7;4" dur="2.2s" repeatCount="indefinite" />
        <animate
          attributeName="fill-opacity"
          values="0.38;0.12;0.38"
          dur="2.2s"
          repeatCount="indefinite"
        />
      </circle>
      <circle
        cx={cx}
        cy={cy}
        r={3}
        fill="var(--primary)"
        className="drop-shadow-[0_0_4px_var(--primary)]"
      >
        <animate attributeName="opacity" values="1;0.82;1" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r={1.5} fill="var(--background)" />
    </g>
  )
}

function formatTooltipDate(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`)
  if (Number.isNaN(date.getTime())) return dateKey

  const now = new Date()
  const msIn7Days = 7 * 24 * 60 * 60 * 1000
  const isRecent = now.getTime() - date.getTime() <= msIn7Days

  return date
    .toLocaleDateString(undefined, {
      ...(isRecent ? { weekday: "short" } : {}),
      day: "numeric",
      month: "short",
    })
    .toLowerCase()
}

function FxRateTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: ChartPoint }[]
}) {
  if (!active || !payload?.length) return null

  const { rate, dateKey } = payload[0].payload
  const datePart = formatTooltipDate(dateKey)

  return (
    <div
      className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs shadow-sm"
      role="status"
    >
      <p className="font-medium tabular-nums text-foreground">
        {formatRate(rate)} COP {datePart}
      </p>
    </div>
  )
}

export function FxRateSparkline({ points }: FxRateSparklineProps) {
  const data = (points || [])
    .map((p) => {
      const rate = new Decimal(p.rate)
      if (!rate.isFinite() || rate.lte(0)) return null
      const date = new Date(`${p.date}T12:00:00`)
      return {
        dateKey: p.date,
        label: Number.isNaN(date.getTime())
          ? p.date
          : date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        rate: rate.toNumber(),
      }
    })
    .filter((row): row is ChartPoint => row !== null)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))

  if (data.length === 0) {
    return (
      <div className="flex h-[140px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
        No chart data yet
      </div>
    )
  }

  const rates = data.map((d) => d.rate)
  const min = Math.min(...rates)
  const max = Math.max(...rates)
  const padding = Math.max((max - min) * 0.15, 20)
  const currentRate = data[data.length - 1]?.rate
  const lastIndex = data.length - 1

  return (
    <div className="h-[140px] w-full [&_.recharts-wrapper]:overflow-visible [&_.recharts-surface]:overflow-visible [&_svg]:overflow-visible">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            width={72}
            domain={[min - padding, max + padding]}
            tickCount={4}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
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
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="var(--primary)"
            fillOpacity={0.12}
            dot={(dotProps) => CurrentRateDot(dotProps, lastIndex)}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
