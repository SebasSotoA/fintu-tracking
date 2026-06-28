"use client"

import type { CashFlow } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts"
import { Decimal } from "@/lib/decimal"
import { formatCurrency } from "@/lib/decimal"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

interface PerformanceChartsProps {
  cashFlows: CashFlow[]
}

const chartConfig = {
  cumulative: {
    label: "Cumulative net deposits",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

const TOOLTIP_CLASS =
  "border-border bg-popover text-popover-foreground shadow-md"

function compactCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

export function PerformanceCharts({ cashFlows }: PerformanceChartsProps) {
  const safeCashFlows = cashFlows || []

  const cumulativeData = safeCashFlows
    .filter((cf) => cf.type === "deposit" || cf.type === "withdrawal")
    .reduce(
      (acc, cf) => {
        const lastValue = acc.length > 0 ? new Decimal(acc[acc.length - 1].cumulative) : new Decimal(0)
        const amount = new Decimal(cf.usd_amount)
        const newValue = cf.type === "deposit" ? lastValue.add(amount) : lastValue.sub(amount)

        acc.push({
          date: new Date(cf.date).toLocaleDateString(),
          cumulative: Number(newValue.toString()),
        })
        return acc
      },
      [] as { date: string; cumulative: number }[],
    )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          Cumulative cash flow
        </CardTitle>
      </CardHeader>
      <CardContent>
        {cumulativeData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[320px] w-full aspect-auto">
            <LineChart data={cumulativeData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--muted-foreground)" strokeOpacity={0.1} />
              <XAxis
                dataKey="date"
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
                tickFormatter={compactCurrency}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className={TOOLTIP_CLASS}
                    formatter={(value) => (
                      <span className="font-mono font-medium tabular-nums text-foreground">
                        {formatCurrency(String(value), MARKET_CONFIG.baseCurrency)}
                      </span>
                    )}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="cumulative"
                stroke="var(--color-cumulative)"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[320px] items-center justify-center text-muted-foreground">
            No data available
          </div>
        )}
      </CardContent>
    </Card>
  )
}
