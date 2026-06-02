"use client"

import { useQuery } from "@tanstack/react-query"
import { Line, LineChart, XAxis, YAxis } from "recharts"
import { GlobeIcon } from "lucide-react"
import { getFxImpact, getFxRateChart } from "@/lib/api/analytics"
import { PERFORMANCE_TOOLTIPS } from "@/components/performance/performance-tooltips"
import { MetricLabel } from "@/components/analytics/metric-primitives"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import Decimal from "decimal.js"

function formatRate(value: string): string {
  return new Decimal(value || "0").toFixed(2)
}

function formatPercent(value: string): string {
  const num = new Decimal(value || "0")
  const prefix = num.greaterThan(0) ? "+" : ""
  return `${prefix}${num.toFixed(2)}%`
}

export function FxImpactCard() {
  const { data: fxImpact, isLoading: fxLoading } = useQuery({
    queryKey: ["fx-impact"],
    queryFn: getFxImpact,
    retry: false,
  })

  const { data: rateChart = [] } = useQuery({
    queryKey: ["fx-rate-chart", 90],
    queryFn: () => getFxRateChart(90),
    retry: false,
  })

  if (fxLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!fxImpact) {
    return null
  }

  const fxImpactUsd = new Decimal(fxImpact.fx_impact_usd || "0")
  const showDollarImpact = !fxImpactUsd.isZero()
  const rateChange = new Decimal(fxImpact.rate_change_pct || "0")
  const rateChangePositive = rateChange.greaterThanOrEqualTo(0)

  const sparklineData = rateChart.map((point) => ({
    date: point.date,
    rate: new Decimal(point.rate || "0").toNumber(),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
          <GlobeIcon className="h-4 w-4" aria-hidden />
          FX rate context
        </CardTitle>
        <CardDescription>
          Deposit-weighted FX context and rate history; approximate where backend data is limited.
        </CardDescription>
        <MetricLabel label="FX context" tooltip={PERFORMANCE_TOOLTIPS.fxContext} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Avg deposit rate
            </p>
            <p className="mt-1 font-mono text-xl tabular-nums md:text-2xl">
              {formatRate(fxImpact.avg_investment_rate)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Current rate
            </p>
            <p className="mt-1 font-mono text-xl tabular-nums md:text-2xl">
              {formatRate(fxImpact.current_rate)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Rate change
            </p>
            <p
              className={cn(
                "mt-1 font-mono text-xl tabular-nums md:text-2xl",
                rateChangePositive ? "text-primary" : "text-destructive",
              )}
            >
              {formatPercent(fxImpact.rate_change_pct)}
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Avg deposit rate vs current: {formatRate(fxImpact.avg_investment_rate)} →{" "}
          {formatRate(fxImpact.current_rate)} COP/USD
        </p>

        {showDollarImpact ? (
          <p className="font-mono text-sm tabular-nums text-muted-foreground">
            Estimated FX impact: {formatPercent(fxImpact.fx_impact_pct)} (
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(fxImpactUsd.toNumber())}
            )
          </p>
        ) : null}

        {sparklineData.length > 0 ? (
          <div className="h-24 w-full">
            <LineChart width={400} height={96} data={sparklineData} className="w-full">
              <XAxis dataKey="date" hide />
              <YAxis hide domain={["dataMin", "dataMax"]} />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="var(--chart-2)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">
          FX impact on returns is approximate; dollar impact may show as zero while rates are
          informational.
        </p>
      </CardContent>
    </Card>
  )
}
