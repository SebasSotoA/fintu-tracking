"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"
import { Decimal } from "@/lib/decimal"
import { createTrade } from "@/lib/api/trades"

export function AddTradeDialog() {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    ticker: "",
    asset_type: "stock" as "stock" | "etf",
    side: "buy" as "buy" | "sell",
    quantity: "",
    price: "",
    fee: "0",
    notes: "",
  })

  const calculateTotal = () => {
    if (!formData.quantity || !formData.price) return "0"
    const quantity = new Decimal(formData.quantity)
    const price = new Decimal(formData.price)
    const fee = new Decimal(formData.fee || 0)
    const subtotal = quantity.mul(price)
    return formData.side === "buy" ? subtotal.add(fee).toString() : subtotal.sub(fee).toString()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      await createTrade({
        date: formData.date,
        ticker: formData.ticker.toUpperCase(),
        asset_type: formData.asset_type,
        side: formData.side,
        quantity: formData.quantity,
        price: formData.price,
        fee: formData.fee,
        notes: formData.notes || null,
      })

      setOpen(false)
      setFormData({
        date: new Date().toISOString().split("T")[0],
        ticker: "",
        asset_type: "stock",
        side: "buy",
        quantity: "",
        price: "",
        fee: "0",
        notes: "",
      })
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create trade")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Trade
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Trade</DialogTitle>
          <DialogDescription>Record a new buy or sell transaction</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticker">Ticker</Label>
              <Input
                id="ticker"
                placeholder="AAPL"
                value={formData.ticker}
                onChange={(e) => setFormData({ ...formData, ticker: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asset_type">Asset Type</Label>
              <Select
                value={formData.asset_type}
                onValueChange={(value: "stock" | "etf") => setFormData({ ...formData, asset_type: value })}
              >
                <SelectTrigger id="asset_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="etf">ETF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="side">Side</Label>
              <Select
                value={formData.side}
                onValueChange={(value: "buy" | "sell") => setFormData({ ...formData, side: value })}
              >
                <SelectTrigger id="side">
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
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="0.00000001"
                placeholder="10"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price (USD)</Label>
              <Input
                id="price"
                type="number"
                step="0.0001"
                placeholder="150.00"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fee">Fee (USD)</Label>
              <Input
                id="fee"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.fee}
                onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Total (USD)</Label>
            <div className="text-2xl font-bold font-mono">${calculateTotal()}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional details..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Trade"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
