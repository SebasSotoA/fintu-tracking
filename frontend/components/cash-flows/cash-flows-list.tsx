"use client"

import type { CashFlow } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import { formatCurrency, format } from "@/lib/decimal"
import { useState } from "react"
import { EditCashFlowDialog } from "./edit-cash-flow-dialog"
import { DeleteCashFlowDialog } from "./delete-cash-flow-dialog"

interface CashFlowsListProps {
  cashFlows: CashFlow[]
}

export function CashFlowsList({ cashFlows: initialCashFlows }: CashFlowsListProps) {
  // Ensure cash flows is a valid array
  const safeCashFlows = initialCashFlows || []
  const [cashFlows] = useState(safeCashFlows)
  const [editingCashFlow, setEditingCashFlow] = useState<CashFlow | null>(null)
  const [deletingCashFlow, setDeletingCashFlow] = useState<CashFlow | null>(null)

  const handleUpdated = () => {
    window.location.reload()
  }

  const handleDeleted = () => {
    window.location.reload()
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
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">FX Rate</TableHead>
                <TableHead className="text-right">USD Amount</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashFlows.map((cf) => (
                <TableRow key={cf.id}>
                  <TableCell>{new Date(cf.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge
                      variant={cf.type === "deposit" ? "default" : cf.type === "withdrawal" ? "secondary" : "outline"}
                    >
                      {cf.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{cf.currency}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(cf.amount, cf.currency as "USD" | "COP")}
                  </TableCell>
                  <TableCell className="text-right font-mono">{cf.fx_rate ? format(cf.fx_rate, 2) : "-"}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {formatCurrency(cf.usd_amount, "USD")}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{cf.notes || "-"}</TableCell>
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editingCashFlow && (
        <EditCashFlowDialog
          cashFlow={editingCashFlow}
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
