"use client"

import type { Trade } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import { formatCurrency, format } from "@/lib/decimal"
import { useState } from "react"
import { EditTradeDialog } from "./edit-trade-dialog"
import { DeleteTradeDialog } from "./delete-trade-dialog"

interface TradesListProps {
  trades: Trade[]
}

export function TradesList({ trades: initialTrades }: TradesListProps) {
  const [trades, setTrades] = useState(initialTrades)
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
  const [deletingTrade, setDeletingTrade] = useState<Trade | null>(null)

  const handleTradeUpdated = () => {
    window.location.reload()
  }

  const handleTradeDeleted = () => {
    window.location.reload()
  }

  if (trades.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">No trades recorded yet</p>
          <p className="text-sm text-muted-foreground">Add your first trade to start tracking your portfolio</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Ticker</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Side</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell>{new Date(trade.date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-mono font-semibold">{trade.ticker}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{trade.asset_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={trade.side === "buy" ? "default" : "secondary"}>{trade.side}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">{format(trade.quantity, 4)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(trade.price, "USD")}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(trade.fee, "USD")}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {formatCurrency(trade.total, "USD")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingTrade(trade)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeletingTrade(trade)}>
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

      {editingTrade && (
        <EditTradeDialog
          trade={editingTrade}
          open={!!editingTrade}
          onOpenChange={() => setEditingTrade(null)}
          onSuccess={handleTradeUpdated}
        />
      )}

      {deletingTrade && (
        <DeleteTradeDialog
          trade={deletingTrade}
          open={!!deletingTrade}
          onOpenChange={() => setDeletingTrade(null)}
          onSuccess={handleTradeDeleted}
        />
      )}
    </>
  )
}
