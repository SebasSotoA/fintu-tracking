"use client"

import { useId } from "react"
import type { FxRate } from "@/lib/types"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface FxRateSparklineProps {
  rates: FxRate[]
}

/** Recharts passes index + coordinates for each point; only render last (newest) point. */
function CurrentRateDot(
  props: { cx?: number; cy?: number; index?: number },
  lastIndex: number,
) {
  const { cx, cy, index } = props
  if (cx == null || cy == null || index == null || index !== lastIndex) {
    return <g />
  }

  return (
    <g aria-hidden="true">
      <circle cx={cx} cy={cy} r={4} fill="var(--primary)" fillOpacity={0.3}>
        <animate attributeName="r" values="4;7;4" dur="2.2s" repeatCount="indefinite" />
        <animate attributeName="fill-opacity" values="0.38;0.12;0.38" dur="2.2s" repeatCount="indefinite" />
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

export function FxRateSparkline({ rates }: FxRateSparklineProps) {
  const safe = rates || []
  const data = [...safe]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((r) => ({
      date: new Date(r.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      rate: Number(r.rate),
    }))

  const lastIndex = Math.max(0, data.length - 1)
  const gradId = useId().replace(/:/g, "")

  if (data.length === 0) {
    return (
      <div className="flex h-[140px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
        Add a rate to see COP/USD history
      </div>
    )
  }

  return (
    <div className="h-[140px] w-full [&_.recharts-wrapper]:overflow-visible [&_.recharts-surface]:overflow-visible [&_svg]:overflow-visible">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 14, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            width={48}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) =>
              typeof v === "number" && v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
            }
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
            }}
            labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
            formatter={(value: number | string) => [
              typeof value === "number" ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value,
              "COP/USD",
            ]}
          />
          <Area
            type="monotone"
            dataKey="rate"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill={`url(#${gradId})`}
            dot={(dotProps) => CurrentRateDot(dotProps, lastIndex)}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
