"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Decimal from "decimal.js"
import { api } from "@/lib/api/client"
import {
  getStandaloneFeesUsd,
  getTransferFeesPaidUsd,
  type CashBreakdown,
} from "@/lib/api/analytics"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

function formatUsd(value: string): string {
  const n = new Decimal(value || "0")
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n.toNumber())
}

function isNonZeroUsd(value: string): boolean {
  try {
    return !new Decimal(value || "0").isZero()
  } catch {
    return false
  }
}

function Row({
  label,
  value,
  sign,
  title,
}: {
  label: string
  value: string
  sign?: "+" | "−"
  title?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground" title={title}>
        {label}
      </span>
      <span className="font-mono tabular-nums text-foreground">
        {sign ? `${sign} ` : ""}
        {formatUsd(value)}
      </span>
    </div>
  )
}

export function CashBreakdownCard() {
  const [open, setOpen] = useState(false)
  const { data, isLoading, error } = useQuery({
    queryKey: ["cash-breakdown"],
    queryFn: () => api.get<CashBreakdown>("/api/analytics/cash-breakdown"),
    staleTime: 60_000,
  })

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />
  }

  if (error || !data) {
    return null
  }

  const transferFeesPaid = getTransferFeesPaidUsd(data)
  const standaloneFees = getStandaloneFeesUsd(data)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">How cash is calculated</CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-expanded={open}
          aria-label={open ? "Hide cash breakdown" : "Show cash breakdown"}
          onClick={() => setOpen((v) => !v)}
        >
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </Button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-3 pt-0 text-sm">
          <p className="text-muted-foreground">
            Cash is uninvested USD — not your full deposit history. Deposits show USD credited by
            Hapi (net after transfer fees). Transfer fees are listed for audit only — already
            reflected in deposits. Trade commissions are inside buy/sell lines. Money used to buy
            stocks appears under Holdings.
          </p>
          <div className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-3">
            <Row
              label="Deposits"
              value={data.deposits_usd}
              sign="+"
              title="USD credited by Hapi (net after transfer fees)"
            />
            <Row label="Withdrawals" value={data.withdrawals_usd} sign="−" />
            {isNonZeroUsd(transferFeesPaid) && (
              <Row label="Transfer fees paid" value={transferFeesPaid} />
            )}
            {isNonZeroUsd(standaloneFees) && (
              <Row label="Standalone fees" value={standaloneFees} sign="−" />
            )}
            <div className="border-t border-border/50 pt-2">
              <Row label="Cash flows net" value={data.cash_flows_net_usd} />
            </div>
            <Row label="Trade buys (incl. fees)" value={data.trade_buys_usd} sign="−" />
            <Row label="Trade sells (net proceeds)" value={data.trade_sells_usd} sign="+" />
            <div className="border-t border-border/50 pt-2">
              <Row label="Net to market" value={data.trade_net_usd} sign="−" />
            </div>
            <div className="border-t border-border/50 pt-2 font-medium">
              <Row label="Cash balance" value={data.cash_balance} />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
