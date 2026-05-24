"use client"

import type React from "react"

import type { Trade } from "@/lib/types"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Decimal } from "@/lib/decimal"
import { cn } from "@/lib/utils"
import { updateTrade } from "@/lib/api/trades"
import { getHoldings, getMarketPrice } from "@/lib/api/portfolio"
import { toDateInputValue } from "@/lib/date-utils"
import {
  buildTradePayload,
  calculateTradeTotal,
  tradeClosingFeeForForm,
  type TradeFormValues,
  validateSellQuantity,
} from "@/lib/trades/trade-form-utils"
import { showToast } from "@/lib/toast"

interface EditTradeDialogProps {
  trade: Trade
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function tradeToFormValues(trade: Trade): TradeFormValues {
  return {
    date: toDateInputValue(trade.date),
    ticker: trade.ticker,
    asset_type: trade.asset_type === "etf" ? "etf" : "stock",
    side: trade.side,
    quantity: new Decimal(trade.quantity).toString(),
    price: new Decimal(trade.price).toString(),
    closing_fee: tradeClosingFeeForForm(trade),
    notes: trade.notes || "",
  }
}

export function EditTradeDialog({ trade, open, onOpenChange, onSuccess }: EditTradeDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [priceWarning, setPriceWarning] = useState<string | null>(null)
  const [formData, setFormData] = useState<TradeFormValues>(() => tradeToFormValues(trade))

  useEffect(() => {
    if (open) {
      setFormData(tradeToFormValues(trade))
      setPriceWarning(null)
      setError(null)
    }
  }, [open, trade])

  const handleTickerBlur = async () => {
    const ticker = formData.ticker.trim().toUpperCase()
    if (!ticker) {
      setPriceWarning(null)
      return
    }
    try {
      await getMarketPrice(ticker)
      setPriceWarning(null)
    } catch {
      setPriceWarning("No cached price yet — use Refresh Prices on the dashboard after saving.")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const holdings = await getHoldings()
      const sellError = validateSellQuantity(
        holdings,
        formData.ticker,
        formData.side,
        formData.quantity,
        trade,
      )
      if (sellError) {
        setError(sellError)
        return
      }

      await updateTrade(trade.id, buildTradePayload(formData))

      showToast.success("Trade updated")
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      showToast.error(
        err instanceof Error ? err.message : "Failed to update trade",
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-4 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Trade</DialogTitle>
          <DialogDescription>Update the trade details</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className={cn(
            "space-y-4",
            priceWarning &&
              "scrollbar-minimal min-h-0 max-h-[min(65vh,36rem)] overflow-y-auto pr-1",
          )}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ticker">Ticker</Label>
              <Input
                id="edit-ticker"
                placeholder="AAPL"
                value={formData.ticker}
                onChange={(e) => {
                  setFormData({ ...formData, ticker: e.target.value })
                  setPriceWarning(null)
                }}
                onBlur={handleTickerBlur}
                required
              />
              {priceWarning && <p className="text-xs text-amber-600 dark:text-amber-500">{priceWarning}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-asset_type">Asset Type</Label>
              <Select
                value={formData.asset_type}
                onValueChange={(value: "stock" | "etf") => setFormData({ ...formData, asset_type: value })}
              >
                <SelectTrigger id="edit-asset_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="etf">ETF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-side">Side</Label>
              <Select
                value={formData.side}
                onValueChange={(value: "buy" | "sell") => setFormData({ ...formData, side: value })}
              >
                <SelectTrigger id="edit-side">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-quantity">Quantity</Label>
              <Input
                id="edit-quantity"
                type="number"
                step="0.00000001"
                placeholder="10"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-price">Price (USD)</Label>
              <Input
                id="edit-price"
                type="number"
                step="0.0001"
                placeholder="150.00"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-closing_fee">Closing fee (USD)</Label>
            <Input
              id="edit-closing_fee"
              type="number"
              step="0.01"
              min="0"
              placeholder="0"
              value={formData.closing_fee}
              onChange={(e) => setFormData({ ...formData, closing_fee: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Hapi fee on this buy or sell. For COP→USD deposit fees, use Cash Flows.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Total (USD)</Label>
            <div className="text-2xl font-bold font-mono">${calculateTradeTotal(formData)}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes (optional)</Label>
            <Textarea
              id="edit-notes"
              placeholder="Additional details..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
