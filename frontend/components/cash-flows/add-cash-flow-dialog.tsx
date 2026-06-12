"use client"

import type { FormEvent } from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { invalidateAfterCashFlowMutation } from "@/lib/api/query-keys"
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
import { DialogScrollBody } from "@/components/ui/dialog-scroll-body"
import { NotesTextarea } from "@/components/ui/notes-textarea"
import { Plus } from "lucide-react"
import { createCashFlow } from "@/lib/api/cash-flows"
import {
  computeGrossUsd,
  computeNetUsdAfterFee,
  feeTypeForCashFlowType,
  parsePositiveFee,
} from "@/lib/cash-flows/deposit-fee-utils"
import { showToast } from "@/lib/toast"

const emptyForm = () => ({
  date: new Date().toISOString().split("T")[0],
  type: "deposit" as "deposit" | "withdrawal" | "fee",
  currency: "COP" as "COP" | "USD",
  amount: "",
  fx_rate: "",
  deposit_fee_usd: "",
  fee_type: "deposit" as "deposit" | "trading" | "closing" | "maintenance" | "other" | "withdrawal",
  notes: "",
})

export function AddCashFlowDialog() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState(emptyForm)

  const isTransfer = formData.type === "deposit" || formData.type === "withdrawal"
  const grossUsd = computeGrossUsd(formData.currency, formData.amount, formData.fx_rate)
  const netUsd = isTransfer ? computeNetUsdAfterFee(grossUsd, formData.deposit_fee_usd) : null
  const feeLabel = formData.type === "withdrawal" ? "Withdrawal fee (USD)" : "Deposit fee (USD)"

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const deposit = await createCashFlow({
        date: formData.date,
        type: formData.type,
        currency: formData.currency,
        amount: formData.amount,
        fx_rate: formData.currency === "COP" ? formData.fx_rate : null,
        fee_type: formData.type === "fee" ? formData.fee_type : null,
        notes: formData.notes || null,
      })

      const feeAmount = isTransfer ? parsePositiveFee(formData.deposit_fee_usd) : null
      if (feeAmount && (formData.type === "deposit" || formData.type === "withdrawal")) {
        const transferType = formData.type
        try {
          await createCashFlow({
            date: formData.date,
            type: "fee",
            currency: "USD",
            amount: feeAmount,
            fx_rate: null,
            fee_type: feeTypeForCashFlowType(transferType),
            related_trade_id: null,
            related_cash_flow_id: deposit.id,
            related_type: transferType,
            notes: `${feeLabel.replace(" (USD)", "")} for ${formData.date}`,
          })
        } catch {
          showToast.error("Deposit saved but fee entry failed")
          await invalidateAfterCashFlowMutation(queryClient)
          router.refresh()
          return
        }
      }

      showToast.success("Cash flow added")
      setOpen(false)
      setFormData(emptyForm())
      await invalidateAfterCashFlowMutation(queryClient)
      router.refresh()
    } catch (err) {
      showToast.error(
        err instanceof Error ? err.message : "Failed to add cash flow",
      )
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
      <DialogContent className="flex max-h-[90vh] max-w-md flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>Add Cash Flow</DialogTitle>
          <DialogDescription>Record a deposit, withdrawal, or fee</DialogDescription>
        </DialogHeader>
        <DialogScrollBody>
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
                onValueChange={(value: "deposit" | "withdrawal" | "fee") =>
                  setFormData({
                    ...formData,
                    type: value,
                    currency: value === "fee" ? "USD" : "COP",
                    deposit_fee_usd: "",
                  })
                }
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
              {isTransfer ? (
                <p id="cf-currency" className="flex h-9 items-center text-sm font-mono">
                  COP
                </p>
              ) : (
                <p id="cf-currency" className="flex h-9 items-center text-sm font-mono">
                  USD
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cf-amount">Amount ({isTransfer ? "COP" : "USD"})</Label>
              <Input
                id="cf-amount"
                type="number"
                step="0.01"
                placeholder={isTransfer ? "1000000" : "10.00"}
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
          </div>

          {formData.type === "fee" && (
            <div className="space-y-2">
              <Label htmlFor="cf-fee-type">Fee Type</Label>
              <Select
                value={formData.fee_type}
                onValueChange={(
                  value: "deposit" | "trading" | "closing" | "maintenance" | "other" | "withdrawal",
                ) => setFormData({ ...formData, fee_type: value })}
              >
                <SelectTrigger id="cf-fee-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="trading">Trading</SelectItem>
                  <SelectItem value="closing">Closing</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {isTransfer && (
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

          {isTransfer && (
            <div className="space-y-2">
              <Label htmlFor="cf-deposit-fee">
                {feeLabel}{" "}
                <span className="text-xs font-normal text-muted-foreground">optional</span>
              </Label>
              <Input
                id="cf-deposit-fee"
                type="number"
                step="0.01"
                min="0"
                placeholder="1.99"
                value={formData.deposit_fee_usd}
                onChange={(e) => setFormData({ ...formData, deposit_fee_usd: e.target.value })}
              />
            </div>
          )}

          <div className="space-y-1">
            <Label>USD amount {isTransfer ? "(before fee)" : ""}</Label>
            <div className="text-2xl font-bold font-mono">${grossUsd}</div>
            {netUsd !== null && (
              <p className="text-sm text-muted-foreground">
                Net after fee: <span className="font-mono font-semibold text-foreground">${netUsd}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cf-notes">Notes (optional)</Label>
            <NotesTextarea
              id="cf-notes"
              placeholder="Additional details..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Cash Flow"}
            </Button>
          </div>
          </form>
        </DialogScrollBody>
      </DialogContent>
    </Dialog>
  )
}
