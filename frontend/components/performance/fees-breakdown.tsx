"use client"

import { useMemo } from "react"
import type { CashFlow } from "@/lib/types"
import { Decimal, formatCurrency } from "@/lib/decimal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

interface FeesBreakdownProps {
  cashFlows: CashFlow[]
}

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

function sumUsd(flows: CashFlow[]): string {
  const total = flows.reduce((sum, cf) => sum.add(new Decimal(cf.usd_amount || cf.amount || "0")), new Decimal(0))
  return formatCurrency(total.toString(), "USD")
}

export function FeesBreakdown({ cashFlows }: FeesBreakdownProps) {
  const transferFees = useMemo(() => cashFlows.filter(isTransferFee), [cashFlows])
  const tradingFees = useMemo(() => cashFlows.filter(isTradingFee), [cashFlows])
  const standaloneFees = useMemo(() => cashFlows.filter(isStandaloneFee), [cashFlows])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Fees</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {standaloneFees.length > 0 && (
          <Badge variant="destructive">
            {standaloneFees.length} unlinked fee row{standaloneFees.length > 1 ? "s" : ""} need review
          </Badge>
        )}
        <Tabs defaultValue="transfer" className="w-full">
          <TabsList>
            <TabsTrigger value="transfer">Transfer fees</TabsTrigger>
            <TabsTrigger value="trading">Trading fees</TabsTrigger>
          </TabsList>
          <TabsContent value="transfer" className="space-y-2 pt-3">
            <p className="text-sm text-muted-foreground">Deposit and withdrawal transfer fees linked to cash flows.</p>
            <p className="text-2xl font-semibold font-mono">{sumUsd(transferFees)}</p>
          </TabsContent>
          <TabsContent value="trading" className="space-y-2 pt-3">
            <p className="text-sm text-muted-foreground">Trading commissions linked to trade executions.</p>
            <p className="text-2xl font-semibold font-mono">{sumUsd(tradingFees)}</p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
