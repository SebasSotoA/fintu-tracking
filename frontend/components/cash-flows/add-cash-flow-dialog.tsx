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
import { createCashFlow } from "@/lib/api/cash-flows"

export function AddCashFlowDialog() {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "deposit" as "deposit" | "withdrawal" | "fee",
    currency: "COP" as "COP" | "USD",
    amount: "",
    fx_rate: "",
    notes: "",
  })

  const calculateUsdAmount = () => {
    if (!formData.amount) return "0"

    const amount = new Decimal(formData.amount)

    if (formData.currency === "USD") {
      return amount.toString()
    } else {
      // COP to USD
      if (!formData.fx_rate) return "0"
      const fxRate = new Decimal(formData.fx_rate)
      return amount.div(fxRate).toString()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      await createCashFlow({
        date: formData.date,
        type: formData.type,
        currency: formData.currency,
        amount: formData.amount,
        fx_rate: formData.currency === "COP" ? formData.fx_rate : null,
        notes: formData.notes || null,
      })

      setOpen(false)
      setFormData({
        date: new Date().toISOString().split("T")[0],
        type: "deposit",
        currency: "COP",
        amount: "",
        fx_rate: "",
        notes: "",
      })
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create cash flow")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Cash Flow
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Cash Flow</DialogTitle>
          <DialogDescription>Record a deposit, withdrawal, or fee</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cf-date">Date</Label>
              <Input
                id="cf-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cf-type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: "deposit" | "withdrawal" | "fee") => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger id="cf-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="fee">Fee</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cf-currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value: "COP" | "USD") => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger id="cf-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COP">COP</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cf-amount">Amount</Label>
              <Input
                id="cf-amount"
                type="number"
                step="0.01"
                placeholder="1000000"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
          </div>

          {formData.currency === "COP" && (
            <div className="space-y-2">
              <Label htmlFor="cf-fx-rate">FX Rate (COP/USD)</Label>
              <Input
                id="cf-fx-rate"
                type="number"
                step="0.01"
                placeholder="4000"
                value={formData.fx_rate}
                onChange={(e) => setFormData({ ...formData, fx_rate: e.target.value })}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>USD Amount</Label>
            <div className="text-2xl font-bold font-mono">${calculateUsdAmount()}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cf-notes">Notes (optional)</Label>
            <Textarea
              id="cf-notes"
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
              {isLoading ? "Adding..." : "Add Cash Flow"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
