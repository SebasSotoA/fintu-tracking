"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import type { NetWorthData } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLocale } from "@/components/locale-provider"
import type { InterpolationVars, MessageKey } from "@/lib/i18n/types"

type Translate = (key: MessageKey, vars?: InterpolationVars) => string

const SLICE_COLORS: Record<string, string> = {
  stock: "var(--chart-1)",
  etf: "var(--chart-2)",
  crypto: "var(--chart-3)",
  cash: "var(--chart-4)",
}

function sliceLabel(key: string, t: Translate): string {
  if (key === "stock") return t("trades.stocks")
  if (key === "etf") return t("trades.etfs")
  if (key === "crypto") return t("trades.crypto")
  if (key === "cash") return t("dashboard.cash")
  return key
}

interface AssetAllocationCardProps {
  data: NetWorthData
}

function formatPct(pct: number): string {
  return `${pct.toFixed(0)}%`
}

export function AssetAllocationCard({ data }: AssetAllocationCardProps) {
  const { t } = useLocale()
  const byType = data.breakdown.by_asset_type ?? {}
  const total = Object.values(byType).reduce((sum, v) => sum + Number(v || 0), 0)

  const slices = Object.entries(byType)
    .filter(([, value]) => Number(value || 0) > 0)
    .map(([key, value]) => {
      const amount = Number(value || 0)
      const pct = total > 0 ? (amount / total) * 100 : 0
      return {
        key,
        label: sliceLabel(key, t),
        value: amount,
        pct,
        colorVar: SLICE_COLORS[key] ?? "var(--muted)",
      }
    })
    .sort((a, b) => b.value - a.value)

  if (slices.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("dashboard.assetAllocation")}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center text-sm text-muted-foreground py-12">
          {t("dashboard.addHoldingsToSeeAllocation")}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("dashboard.assetAllocation")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="w-40 h-40 sm:w-44 sm:h-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="label"
                  innerRadius="62%"
                  outerRadius="100%"
                  strokeWidth={2}
                  stroke="var(--background)"
                  isAnimationActive={false}
                >
                  {slices.map((slice) => (
                    <Cell key={slice.key} fill={slice.colorVar} />
                  ))}
                </Pie>
                <Tooltip
                  cursor={false}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--popover-foreground)",
                  }}
                  labelStyle={{
                    color: "var(--popover-foreground)",
                    fontWeight: 600,
                  }}
                  itemStyle={{
                    color: "var(--popover-foreground)",
                  }}
                  formatter={(value: number, _name, item) => {
                    const pct = item?.payload?.pct ?? 0
                    return [`$${value.toFixed(2)} (${pct.toFixed(1)}%)`, item?.payload?.label ?? ""]
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex flex-col gap-2 text-sm flex-1 min-w-0">
            {slices.map((slice) => (
              <li key={slice.key} className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ background: slice.colorVar }}
                  aria-hidden
                />
                <span className="text-muted-foreground">{slice.label}</span>
                <span className="ml-auto font-mono tabular-nums text-foreground">
                  {formatPct(slice.pct)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
