"use client"

import type React from "react"

import type { Trade } from "@/lib/types"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DialogScrollBody } from "@/components/ui/dialog-scroll-body"
import { ResponsiveFormGrid } from "@/components/ui/responsive-form-grid"
import { NotesTextarea } from "@/components/ui/notes-textarea"
import { SingleDatePicker } from "@/components/filters/single-date-picker"
import { SellTickerSelect } from "@/components/trades/sell-ticker-select"
import { Decimal } from "@/lib/decimal"
import { updateTrade } from "@/lib/api/trades"
import { getHoldings, getMarketPrice } from "@/lib/api/portfolio"
import { toDateInputValue } from "@/lib/date-utils"
import { BrokerSelect } from "@/components/brokers/broker-select"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"
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
    asset_type:
      trade.asset_type === "etf"
        ? "etf"
        : trade.asset_type === "crypto"
          ? "crypto"
          : "stock",
    side: trade.side,
    quantity: new Decimal(trade.quantity).toString(),
    price: new Decimal(trade.price).toString(),
    closing_fee: tradeClosingFeeForForm(trade),
    broker_id: trade.broker_id || (MARKET_CONFIG.defaultBrokerId as string),
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
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="flex max-h-[100dvh] md:max-h-[90vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <ResponsiveDialogHeader className="shrink-0 px-6 pt-6">
          <ResponsiveDialogTitle>Edit Trade</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>Update the trade details</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <DialogScrollBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <ResponsiveFormGrid>
              <SingleDatePicker
                id="edit-date"
                label="Date"
                ariaLabel="Trade date"
                value={formData.date}
                onChange={(date) => setFormData({ ...formData, date })}
                required
              />
            {formData.side === "sell" ? (
              <SellTickerSelect
                id="edit-ticker"
                value={formData.ticker}
                onChange={(ticker, holding) => {
                  setFormData({
                    ...formData,
                    ticker,
                    asset_type:
                      holding?.assetType === "etf"
                        ? "etf"
                        : holding?.assetType === "crypto"
                          ? "crypto"
                          : "stock",
                  })
                  setPriceWarning(null)
                }}
              />
            ) : (
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
                {priceWarning && <p className="text-xs text-destructive">{priceWarning}</p>}
              </div>
            )}
          </ResponsiveFormGrid>

          <ResponsiveFormGrid>
            <div className="space-y-2">
              <Label htmlFor="edit-asset_type">Asset Type</Label>
              <Select
                value={formData.asset_type}
                onValueChange={(value: "stock" | "etf" | "crypto") =>
                  setFormData({ ...formData, asset_type: value })
                }
              >
                <SelectTrigger id="edit-asset_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="etf">ETF</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-side">Side</Label>
              <Select
                value={formData.side}
                onValueChange={(value: "buy" | "sell") =>
                  setFormData({
                    ...formData,
                    side: value,
                    ticker: value === "buy" ? formData.ticker : trade.side === "sell" ? formData.ticker : "",
                  })
                }
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
          </ResponsiveFormGrid>

          <BrokerSelect
            id="edit-broker"
            value={formData.broker_id}
            onChange={(value) => setFormData({ ...formData, broker_id: value })}
          />

          <ResponsiveFormGrid>
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
              <Label htmlFor="edit-price">Price</Label>
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
          </ResponsiveFormGrid>

          <div className="space-y-2">
            <Label htmlFor="edit-closing_fee">Commission</Label>
            <Input
              id="edit-closing_fee"
              type="number"
              step="0.01"
              min="0"
              placeholder="0"
              value={formData.closing_fee}
              onChange={(e) => setFormData({ ...formData, closing_fee: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Mapped to trading fee for this trade.</p>
          </div>

          <div className="space-y-2">
            <Label>Total ({MARKET_CONFIG.baseCurrency})</Label>
            <div className="text-2xl font-bold font-mono">${calculateTradeTotal(formData)}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes (optional)</Label>
            <NotesTextarea
              id="edit-notes"
              placeholder="Additional details..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
          </form>
        </DialogScrollBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
