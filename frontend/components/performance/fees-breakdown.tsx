"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight } from "lucide-react"
import type { CashFlow } from "@/lib/types"
import { Decimal, formatCurrency } from "@/lib/decimal"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"
import { listCashFlowsForExport } from "@/lib/api/cash-flows"
import { queryKeys } from "@/lib/api/query-keys"
import { cn } from "@/lib/utils"

function isTransferFee(cf: CashFlow): boolean {
  return (
    cf.type === "fee" &&
    (cf.related_type === "deposit" ||
      cf.related_type === "withdrawal" ||
      cf.fee_type === "deposit" ||
      cf.fee_type === "withdrawal")
  )
}

function isTradingFee(cf: CashFlow): boolean {
  return (
    cf.type === "fee" &&
    (cf.related_type === "trade" || cf.fee_type === "trading" || cf.fee_type === "closing")
  )
}

function isStandaloneFee(cf: CashFlow): boolean {
  return (
    cf.type === "fee" &&
    !cf.related_trade_id &&
    !cf.related_cash_flow_id &&
    (cf.related_type === "standalone" || cf.related_type === null)
  )
}

const BADGE_BASE =
  "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0"

function sumAmount(flows: CashFlow[]): Decimal {
  return flows.reduce((sum, cf) => sum.add(new Decimal(cf.usd_amount || cf.amount || "0")), new Decimal(0))
}

function formatUSD(value: Decimal): string {
  return formatCurrency(value.toString(), MARKET_CONFIG.baseCurrency)
}

export function FeesBreakdown() {
  const { data: cashFlows = [], isLoading } = useQuery<CashFlow[]>({
    queryKey: queryKeys.cashFlowsExport(),
    queryFn: () => listCashFlowsForExport(),
    staleTime: 60_000,
  })

  const transferFees = useMemo(() => cashFlows.filter(isTransferFee), [cashFlows])
  const tradingFees = useMemo(() => cashFlows.filter(isTradingFee), [cashFlows])
  const standaloneFees = useMemo(() => cashFlows.filter(isStandaloneFee), [cashFlows])

  const transferTotal = sumAmount(transferFees)
  const tradingTotal = sumAmount(tradingFees)
  const grandTotal = transferTotal.add(tradingTotal)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-3 py-6">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="py-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          Fees paid
        </h3>
        <p className="text-2xl font-bold font-mono tabular-nums text-destructive mb-4">
          {formatUSD(grandTotal)}
        </p>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn(BADGE_BASE, "bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-400/20")}>
                Transfer
              </span>
              <span className="text-sm text-muted-foreground">Deposit & withdrawal fees</span>
            </div>
            <span className="text-sm font-mono font-semibold tabular-nums text-destructive">
              {formatUSD(transferTotal)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn(BADGE_BASE, "bg-indigo-500/15 text-indigo-300 ring-1 ring-inset ring-indigo-400/20")}>
                Trading
              </span>
              <span className="text-sm text-muted-foreground">Trade commissions</span>
            </div>
            <span className="text-sm font-mono font-semibold tabular-nums text-destructive">
              {formatUSD(tradingTotal)}
            </span>
          </div>
        </div>
        {standaloneFees.length > 0 && (
          <p className="mt-4 text-xs text-muted-foreground">
            {standaloneFees.length} unlinked fee row{standaloneFees.length > 1 ? "s" : ""} need review
          </p>
        )}
        <Link
          href="/cash-flows"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View full breakdown
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  )
}