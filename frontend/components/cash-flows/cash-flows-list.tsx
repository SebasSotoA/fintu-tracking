"use client"

import type { CashFlow } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, LinkIcon } from "lucide-react"
import { formatCalendarDate } from "@/lib/date-utils"
import { formatAmountPlain, formatCurrency } from "@/lib/decimal"
import {
  getDepositWithdrawalUsdDisplay,
  getFeeAttributionLabel,
  getLinkedFeeUsdHint,
} from "@/lib/cash-flows/cash-flows-list-display"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { EditCashFlowDialog } from "./edit-cash-flow-dialog"
import { DeleteCashFlowDialog } from "./delete-cash-flow-dialog"
import Link from "next/link"

interface CashFlowsListProps {
  cashFlows: CashFlow[]
  highlightId?: string
}

export function CashFlowsList({ cashFlows: initialCashFlows, highlightId }: CashFlowsListProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const cashFlows = initialCashFlows || []
  const [editingCashFlow, setEditingCashFlow] = useState<CashFlow | null>(null)
  const [deletingCashFlow, setDeletingCashFlow] = useState<CashFlow | null>(null)

  const handleUpdated = () => {
    router.refresh()
    queryClient.invalidateQueries({ queryKey: ["net-worth"] })
  }

  const handleDeleted = () => {
    router.refresh()
    queryClient.invalidateQueries({ queryKey: ["net-worth"] })
  }

  if (cashFlows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">No cash flows recorded yet</p>
          <p className="text-sm text-muted-foreground">Add your first deposit or withdrawal to start tracking</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Fee Type</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">USD Amount</TableHead>
                <TableHead>Attribution</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashFlows.map((cf) => {
                const isTransfer = cf.type === "deposit" || cf.type === "withdrawal"
                const usdDisplay = isTransfer ? getDepositWithdrawalUsdDisplay(cashFlows, cf) : null
                const feeUsdHint = cf.type === "fee" ? getLinkedFeeUsdHint(cashFlows, cf) : null
                const feeAttributionLabel = cf.type === "fee" ? getFeeAttributionLabel(cashFlows, cf) : null

                return (
                <TableRow
                  key={cf.id}
                  className={cf.id === highlightId ? "bg-amber-50 dark:bg-amber-950/20 ring-1 ring-inset ring-amber-400" : undefined}
                >
                  <TableCell>{formatCalendarDate(cf.date)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={cf.type === "deposit" ? "default" : cf.type === "withdrawal" ? "secondary" : "destructive"}
                    >
                      {cf.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {cf.fee_type ? (
                      <Badge variant="outline" className="capitalize">
                        {cf.fee_type}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{cf.currency}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatAmountPlain(cf.amount, cf.currency as "USD" | "COP")}
                  </TableCell>
                  <TableCell className="text-right">
                    {usdDisplay ? (
                      <div className="font-mono font-semibold">
                        <div>{usdDisplay.primaryUsd}</div>
                        {usdDisplay.breakdown ? (
                          <div className="text-xs font-normal text-muted-foreground font-sans">
                            {usdDisplay.breakdown}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="font-mono font-semibold">
                        <div>{formatCurrency(cf.usd_amount, "USD")}</div>
                        {feeUsdHint ? (
                          <div className="text-xs font-normal text-muted-foreground font-sans">{feeUsdHint}</div>
                        ) : null}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {cf.related_type === "trade" && cf.related_trade_id ? (
                      <Link href={`/trades?highlight=${cf.related_trade_id}`}>
                        <Button variant="ghost" size="sm" className="h-auto py-1 px-2">
                          <LinkIcon className="h-3 w-3 mr-1" />
                          <span className="text-xs">Trade</span>
                        </Button>
                      </Link>
                    ) : feeAttributionLabel && cf.related_cash_flow_id ? (
                      <Link href={`/cash-flows?highlight=${cf.related_cash_flow_id}`}>
                        <Button variant="ghost" size="sm" className="h-auto py-1 px-2 text-left">
                          <LinkIcon className="h-3 w-3 mr-1 shrink-0" />
                          <span className="text-xs">{feeAttributionLabel}</span>
                        </Button>
                      </Link>
                    ) : cf.related_cash_flow_id ? (
                      <Link href={`/cash-flows?highlight=${cf.related_cash_flow_id}`}>
                        <Button variant="ghost" size="sm" className="h-auto py-1 px-2">
                          <LinkIcon className="h-3 w-3 mr-1" />
                          <span className="text-xs capitalize">{cf.related_type ?? "Cash flow"}</span>
                        </Button>
                      </Link>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        {cf.related_type === "standalone" ? "Standalone" : "-"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                    {cf.notes || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingCashFlow(cf)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeletingCashFlow(cf)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editingCashFlow && (
        <EditCashFlowDialog
          cashFlow={editingCashFlow}
          cashFlows={cashFlows}
          open={!!editingCashFlow}
          onOpenChange={() => setEditingCashFlow(null)}
          onSuccess={handleUpdated}
        />
      )}

      {deletingCashFlow && (
        <DeleteCashFlowDialog
          cashFlow={deletingCashFlow}
          open={!!deletingCashFlow}
          onOpenChange={() => setDeletingCashFlow(null)}
          onSuccess={handleDeleted}
        />
      )}
    </>
  )
}
