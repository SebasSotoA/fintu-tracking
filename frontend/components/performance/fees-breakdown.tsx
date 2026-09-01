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
import { getFeeBreakdown, type FeeBreakdown } from "@/lib/api/analytics"
import { listCashFlowsForExport } from "@/lib/api/cash-flows"
import { queryKeys } from "@/lib/api/query-keys"
import { cn } from "@/lib/utils"
import { useLocale } from "@/components/locale-provider"

function isTransferFee(cf: CashFlow): boolean {
  return (
    cf.type === "fee" &&
    (cf.related_type === "deposit" ||
      cf.related_type === "withdrawal" ||
      cf.fee_type === "deposit" ||
      cf.fee_type === "withdrawal")
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
  const { t } = useLocale()
  const { data: cashFlows = [], isLoading: cashFlowsLoading } = useQuery<CashFlow[]>({
    queryKey: queryKeys.cashFlowsExport(),
    queryFn: () => listCashFlowsForExport(),
    staleTime: 60_000,
  })

  const { data: feeBreakdown, isLoading: breakdownLoading } = useQuery<FeeBreakdown>({
    queryKey: queryKeys.feeBreakdown(),
    queryFn: () => getFeeBreakdown(),
    staleTime: 60_000,
  })

  const transferFees = useMemo(() => cashFlows.filter(isTransferFee), [cashFlows])
  const standaloneFees = useMemo(() => cashFlows.filter(isStandaloneFee), [cashFlows])

  const transferTotal = sumAmount(transferFees)
  const tradingTotal = new Decimal(feeBreakdown?.trading_fees || "0")
  const grandTotal = transferTotal.add(tradingTotal)

  if (cashFlowsLoading || breakdownLoading) {
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
          {t("performance.feesPaid")}
        </h3>
        <p className="text-2xl font-bold font-mono tabular-nums text-foreground mb-4">
          {formatUSD(grandTotal)}
        </p>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn(BADGE_BASE, "bg-amber-500/15 text-amber-800 dark:text-amber-300 ring-1 ring-inset ring-amber-400/20")}>
                {t("performance.transfer")}
              </span>
              <span className="text-sm text-muted-foreground">{t("performance.depositWithdrawalFees")}</span>
            </div>
            <span className="text-sm font-mono font-semibold tabular-nums text-muted-foreground">
              {formatUSD(transferTotal)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn(BADGE_BASE, "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-400/20")}>
                {t("performance.trading")}
              </span>
              <span className="text-sm text-muted-foreground">{t("performance.tradeCommissions")}</span>
            </div>
            <span className="text-sm font-mono font-semibold tabular-nums text-muted-foreground">
              {formatUSD(tradingTotal)}
            </span>
          </div>
        </div>
        {standaloneFees.length > 0 && (
          <p className="mt-4 text-xs text-muted-foreground">
            {standaloneFees.length === 1
              ? t("performance.unlinkedFeeRow", { count: standaloneFees.length })
              : t("performance.unlinkedFeeRows", { count: standaloneFees.length })}
          </p>
        )}
        <Link
          href="/cash-flows"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t("performance.viewFullBreakdown")}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  )
}