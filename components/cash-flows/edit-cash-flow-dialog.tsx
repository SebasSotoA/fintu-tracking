"use client"

import type React from "react"

import type { CashFlow } from "@/lib/types"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { Decimal } from "@/lib/decimal"

interface EditCashFlowDialogProps {
  cashFlow: CashFlow
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditCashFlowDialog({ cashFlow, open, onOpenChange, onSuccess }: EditCashFlowDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    date: cashFlow.date,
    type: cashFlow.type,
    currency: cashFlow.currency,
    amount: cashFlow.amount,
    fx_rate: cashFlow.fx_rate || "",
    notes: cashFlow.notes || "",
  })

  const calculateUsdAmount = () => {
    if (!formData.amount) return "0"

    const amount = new Decimal(formData.amount)

    if (formData.currency === "USD") {
      return amount.toString()
    } else {
      if (!formData.fx_rate) return "0"
      const fxRate = new Decimal(formData.fx_rate)
      return amount.div(fxRate).toString()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const usdAmount = calculateUsdAmount()

    const { error: updateError } = await supabase
      .from("cash_flows")
      .update({
        date: formData.date,
        type: formData.type,
        currency: formData.currency,
        amount: formData.amount,
        fx_rate: formData.currency === "COP" ? formData.fx_rate : null,
        usd_amount: usdAmount,
        notes: formData.notes || null,
      })
      .eq("id", cashFlow.id)

    if (updateError) {
      setError(updateError.message)
      setIsLoading(false)
      return
    }

    onOpenChange(false)
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Cash Flow</DialogTitle>
          <DialogDescription>Update the cash flow details</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-cf-date">Date</Label>
              <Input
                id="edit-cf-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cf-type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: "deposit" | "withdrawal" | "fee") => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger id="edit-cf-type">
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
              <Label htmlFor="edit-cf-currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value: "COP" | "USD") => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger id="edit-cf-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COP">COP</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cf-amount">Amount</Label>
              <Input
                id="edit-cf-amount"
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
              <Label htmlFor="edit-cf-fx-rate">FX Rate (COP/USD)</Label>
              <Input
                id="edit-cf-fx-rate"
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
            <Label htmlFor="edit-cf-notes">Notes (optional)</Label>
            <Textarea
              id="edit-cf-notes"
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
