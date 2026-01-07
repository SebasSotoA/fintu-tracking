"use client"

import type React from "react"

import type { Trade } from "@/lib/types"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Decimal } from "@/lib/decimal"
import { updateTrade } from "@/lib/api/trades"

interface EditTradeDialogProps {
  trade: Trade
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditTradeDialog({ trade, open, onOpenChange, onSuccess }: EditTradeDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    date: trade.date,
    ticker: trade.ticker,
    asset_type: trade.asset_type,
    side: trade.side,
    quantity: trade.quantity,
    price: trade.price,
    fee: trade.fee,
    notes: trade.notes || "",
  })

  const [feeType, setFeeType] = useState<"fixed" | "percentage">("fixed")
  const [feePercentage, setFeePercentage] = useState("")

  const calculateFeeAmount = () => {
    if (!formData.quantity || !formData.price) return "0"
    if (feeType === "fixed") {
      return formData.fee || "0"
    }
    // Calculate fee from percentage
    if (!feePercentage) return "0"
    const quantity = new Decimal(formData.quantity)
    const price = new Decimal(formData.price)
    const percentage = new Decimal(feePercentage)
    const subtotal = quantity.mul(price)
    return subtotal.mul(percentage).div(100).toString()
  }

  const calculateTotal = () => {
    if (!formData.quantity || !formData.price) return "0"
    const quantity = new Decimal(formData.quantity)
    const price = new Decimal(formData.price)
    const fee = new Decimal(calculateFeeAmount())
    const subtotal = quantity.mul(price)
    return formData.side === "buy" ? subtotal.add(fee).toString() : subtotal.sub(fee).toString()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      await updateTrade(trade.id, {
        date: formData.date,
        ticker: formData.ticker.toUpperCase(),
        asset_type: formData.asset_type as "stock" | "etf",
        side: formData.side as "buy" | "sell",
        quantity: formData.quantity,
        price: formData.price,
        fee: calculateFeeAmount(),
        notes: formData.notes || null,
      })

      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update trade")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Trade</DialogTitle>
          <DialogDescription>Update the trade details</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
                onChange={(e) => setFormData({ ...formData, ticker: e.target.value })}
                required
              />
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

          <div className="grid grid-cols-3 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="edit-fee-type">Fee Type</Label>
              <Select value={feeType} onValueChange={(value: "fixed" | "percentage") => setFeeType(value)}>
                <SelectTrigger id="edit-fee-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">USD</SelectItem>
                  <SelectItem value="percentage">%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-fee">
              {feeType === "fixed" ? "Fee Amount (USD)" : "Fee Percentage (%)"}
            </Label>
            <Input
              id="edit-fee"
              type="number"
              step={feeType === "fixed" ? "0.01" : "0.01"}
              placeholder={feeType === "fixed" ? "0.00" : "0.25"}
              value={feeType === "fixed" ? formData.fee : feePercentage}
              onChange={(e) => {
                if (feeType === "fixed") {
                  setFormData({ ...formData, fee: e.target.value })
                } else {
                  setFeePercentage(e.target.value)
                }
              }}
            />
            {feeType === "percentage" && feePercentage && formData.quantity && formData.price && (
              <p className="text-sm text-muted-foreground">
                = ${new Decimal(calculateFeeAmount()).toFixed(2)} USD
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Total (USD)</Label>
            <div className="text-2xl font-bold font-mono">${calculateTotal()}</div>
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
