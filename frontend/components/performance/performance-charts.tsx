"use client"

import type { CashFlow, FxRate } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Decimal } from "@/lib/decimal"

interface PerformanceChartsProps {
  cashFlows: CashFlow[]
  fxRates: FxRate[]
}

export function PerformanceCharts({ cashFlows, fxRates }: PerformanceChartsProps) {
  // Ensure all arrays are valid
  const safeCashFlows = cashFlows || []
  const safeFxRates = fxRates || []

  // Prepare cumulative cash flow data
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

  // Prepare FX rate data
  const fxData = safeFxRates
    .slice()
    .reverse()
    .map((fx) => ({
      date: new Date(fx.date).toLocaleDateString(),
      rate: Number(fx.rate),
    }))

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Cumulative Cash Flow (USD)</CardTitle>
        </CardHeader>
        <CardContent>
          {cumulativeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--muted-foreground)" strokeOpacity={0.1} />
                <XAxis 
                  dataKey="date" 
                  className="text-xs text-muted-foreground" 
                  stroke="var(--muted-foreground)"
                  strokeOpacity={0.3}
                />
                <YAxis 
                  className="text-xs text-muted-foreground" 
                  stroke="var(--muted-foreground)"
                  strokeOpacity={0.3}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid color-mix(in oklch, var(--primary) 20%, transparent)",
                    borderRadius: "0.5rem",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  labelStyle={{ color: "var(--foreground)", fontWeight: "600" }}
                />
                <Line type="monotone" dataKey="cumulative" stroke="var(--primary)" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">No data available</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">FX Rate History (COP/USD)</CardTitle>
        </CardHeader>
        <CardContent>
          {fxData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={fxData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--muted-foreground)" strokeOpacity={0.1} />
                <XAxis 
                  dataKey="date" 
                  className="text-xs text-muted-foreground" 
                  stroke="var(--muted-foreground)"
                  strokeOpacity={0.3}
                />
                <YAxis 
                  className="text-xs text-muted-foreground" 
                  stroke="var(--muted-foreground)"
                  strokeOpacity={0.3}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid color-mix(in oklch, var(--primary) 20%, transparent)",
                    borderRadius: "0.5rem",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  labelStyle={{ color: "var(--foreground)", fontWeight: "600" }}
                />
                <Line type="monotone" dataKey="rate" stroke="var(--chart-2)" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">No data available</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
