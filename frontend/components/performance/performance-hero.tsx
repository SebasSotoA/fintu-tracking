"use client"

import type React from "react"
import { useQuery } from "@tanstack/react-query"
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"
import Decimal from "decimal.js"
import { getNetWorth } from "@/lib/api/analytics"
import { queryKeys } from "@/lib/api/query-keys"
import type { CashFlow, NetWorthData } from "@/lib/types"
import { MetricLabel, StatCell } from "@/components/analytics/metric-primitives"
import { PERFORMANCE_TOOLTIPS } from "@/components/performance/performance-tooltips"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface PerformanceHeroProps {
  initialNetWorth: NetWorthData | null
  cashFlows: CashFlow[]
}

function formatUsd(value: Decimal): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value.toNumber())
}

function formatPct(value: Decimal): string {
  return `${value.toFixed(2)}%`
}

function isXirrPlaceholder(xirr: Decimal): boolean {
  return xirr.isZero()
}

function formatPeriodLabel(cashFlows: CashFlow[]): string {
  const deposits = cashFlows.filter((cf) => cf.type === "deposit")
  if (deposits.length === 0) return "—"
  const earliest = deposits.reduce(
    (min, cf) => (cf.date < min ? cf.date : min),
    deposits[0].date,
  )
  return new Date(earliest).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })
}

export function PerformanceHero({
  initialNetWorth,
  cashFlows,
}: PerformanceHeroProps): React.JSX.Element {
  const { data: netWorth, isLoading, error } = useQuery({
    queryKey: queryKeys.netWorth(),
    queryFn: () => getNetWorth(),
    initialData: initialNetWorth ?? undefined,
    staleTime: 60_000,
  })

  if (isLoading && !netWorth) {
    return (
      <Card variant="kpi" className="col-span-full">
        <CardContent className="space-y-4 pt-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || !netWorth) {
    return (
      <Card className="col-span-full border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Performance</CardTitle>
          <CardDescription>
            Failed to load portfolio performance data. Please try refreshing the page.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const gainLoss = new Decimal(netWorth.total_gain_loss || "0")
  const gainLossPct = new Decimal(netWorth.total_gain_loss_pct || "0")
  const totalInvested = new Decimal(netWorth.total_invested || "0")
  const totalFees = new Decimal(netWorth.total_fees || "0")
  const xirr = new Decimal(netWorth.xirr || "0")
  const isPositive = gainLoss.greaterThanOrEqualTo(0)

  const feeDragPct = totalInvested.greaterThan(0)
    ? totalFees.div(totalInvested).mul(100)
    : new Decimal(0)

  return (
    <Card variant="kpi" className="col-span-full">
      <CardContent className="space-y-6 pt-6">
        <section className="space-y-2">
          <MetricLabel label="Net return" tooltip={PERFORMANCE_TOOLTIPS.netReturnPct} />
          <div className="flex flex-wrap items-baseline gap-3">
            <h2
              className={`text-4xl font-bold font-mono tracking-tight tabular-nums md:text-5xl ${
                isPositive ? "text-primary" : "text-destructive"
              }`}
            >
              {formatPct(gainLossPct)}
            </h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant={isPositive ? "default" : "destructive"}
                  className="cursor-default px-3 py-1 text-base tabular-nums"
                >
                  <span className="flex items-center gap-1">
                    {isPositive ? (
                      <ArrowUpIcon className="size-4" />
                    ) : (
                      <ArrowDownIcon className="size-4" />
                    )}
                    {formatUsd(gainLoss.abs())} ({formatPct(gainLossPct.abs())})
                  </span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                {PERFORMANCE_TOOLTIPS.netReturnPct}
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-sm text-muted-foreground font-mono tabular-nums">
            {formatUsd(gainLoss)} total gain/loss
            {totalInvested.greaterThan(0) && (
              <>
                {" "}
                · vs {formatUsd(totalInvested)} invested
              </>
            )}
          </p>
        </section>

        <Separator />

        <section
          aria-label="Performance summary"
          className="grid grid-cols-2 gap-4 rounded-lg border border-border/50 bg-muted/30 p-4 md:grid-cols-3"
        >
          <StatCell
            label="Money-weighted return (XIRR)"
            tooltip={PERFORMANCE_TOOLTIPS.timeWeightedReturn}
            value={isXirrPlaceholder(xirr) ? "—" : formatPct(xirr)}
            valueClassName={
              isXirrPlaceholder(xirr)
                ? "text-muted-foreground"
                : xirr.greaterThanOrEqualTo(0)
                  ? "text-primary"
                  : "text-destructive"
            }
          />
          <StatCell
            label="Fee drag"
            tooltip={PERFORMANCE_TOOLTIPS.feeDrag}
            value={formatPct(feeDragPct)}
            valueClassName="text-destructive"
          />
          <StatCell
            label="Since first deposit"
            tooltip="Date of your earliest recorded deposit in this portfolio."
            value={formatPeriodLabel(cashFlows)}
            valueClassName="text-foreground text-base md:text-lg font-medium font-sans"
          />
        </section>
      </CardContent>
    </Card>
  )
}
