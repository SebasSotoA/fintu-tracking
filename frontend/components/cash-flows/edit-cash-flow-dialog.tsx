"use client"

import type { FormEvent } from "react"

import type { CashFlow } from "@/lib/types"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createCashFlow, deleteCashFlow, updateCashFlow } from "@/lib/api/cash-flows"
import {
  computeGrossUsd,
  computeNetUsdAfterFee,
  feeTypeForCashFlowType,
  findLinkedDepositFee,
  parsePositiveFee,
} from "@/lib/cash-flows/deposit-fee-utils"
import { toDateInputValue } from "@/lib/date-utils"
import { showToast } from "@/lib/toast"

interface EditCashFlowDialogProps {
  cashFlow: CashFlow
  cashFlows: CashFlow[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditCashFlowDialog({
  cashFlow,
  cashFlows,
  open,
  onOpenChange,
  onSuccess,
}: EditCashFlowDialogProps) {
  const linkedFee = useMemo(
    () => findLinkedDepositFee(cashFlows, cashFlow.id),
    [cashFlows, cashFlow.id],
  )

  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    date: toDateInputValue(cashFlow.date),
    type: cashFlow.type,
    currency: cashFlow.currency,
    amount: cashFlow.amount,
    fx_rate: cashFlow.fx_rate || "",
    deposit_fee_usd: linkedFee?.amount ?? "",
    fee_type: (cashFlow.fee_type || "other") as
      | "deposit"
      | "trading"
      | "closing"
      | "maintenance"
      | "other"
      | "withdrawal",
    notes: cashFlow.notes || "",
  })

  useEffect(() => {
    if (!open) return
    const fee = findLinkedDepositFee(cashFlows, cashFlow.id)
    setFormData({
      date: toDateInputValue(cashFlow.date),
      type: cashFlow.type,
      currency: cashFlow.currency,
      amount: cashFlow.amount,
      fx_rate: cashFlow.fx_rate || "",
      deposit_fee_usd: fee?.amount ?? "",
      fee_type: (cashFlow.fee_type || "other") as
        | "deposit"
        | "trading"
        | "closing"
        | "maintenance"
        | "other"
        | "withdrawal",
      notes: cashFlow.notes || "",
    })
  }, [open, cashFlow, cashFlows])

  const isTransfer = formData.type === "deposit" || formData.type === "withdrawal"
  const grossUsd = computeGrossUsd(
    formData.currency as "COP" | "USD",
    formData.amount,
    formData.fx_rate,
  )
  const netUsd = isTransfer ? computeNetUsdAfterFee(grossUsd, formData.deposit_fee_usd) : null
  const feeLabel = formData.type === "withdrawal" ? "Withdrawal fee (USD)" : "Deposit fee (USD)"

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await updateCashFlow(cashFlow.id, {
        date: formData.date,
        type: formData.type as "deposit" | "withdrawal" | "fee",
        currency: formData.currency as "COP" | "USD",
        amount: formData.amount,
        fx_rate: formData.currency === "COP" ? formData.fx_rate : null,
        fee_type: formData.type === "fee" ? formData.fee_type : null,
        notes: formData.notes || null,
      })

      if (isTransfer) {
        const feeAmount = parsePositiveFee(formData.deposit_fee_usd)
        const transferType = formData.type as "deposit" | "withdrawal"

        if (feeAmount) {
          const feePayload = {
            date: formData.date,
            type: "fee" as const,
            currency: "USD" as const,
            amount: feeAmount,
            fx_rate: null as null,
            fee_type: feeTypeForCashFlowType(transferType),
            related_trade_id: null,
            related_cash_flow_id: cashFlow.id,
            related_type: transferType,
            notes: `${feeLabel.replace(" (USD)", "")} for ${formData.date}`,
          }

          if (linkedFee) {
            await updateCashFlow(linkedFee.id, feePayload)
          } else {
            await createCashFlow(feePayload)
          }
        } else if (linkedFee) {
          await deleteCashFlow(linkedFee.id)
        }
      }

      showToast.success("Cash flow updated")
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      showToast.error(
        err instanceof Error ? err.message : "Failed to update cash flow",
      )
    } finally {
      setIsLoading(false)
    }
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
                onValueChange={(value: "deposit" | "withdrawal" | "fee") =>
                  setFormData({ ...formData, type: value, deposit_fee_usd: "" })
                }
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

          {formData.type === "fee" && (
            <div className="space-y-2">
              <Label htmlFor="edit-cf-fee-type">Fee Type</Label>
              <Select
                value={formData.fee_type}
                onValueChange={(
                  value: "deposit" | "trading" | "closing" | "maintenance" | "other" | "withdrawal",
                ) => setFormData({ ...formData, fee_type: value })}
              >
                <SelectTrigger id="edit-cf-fee-type">
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

          {isTransfer && (
            <div className="space-y-2">
              <Label htmlFor="edit-cf-deposit-fee">
                {feeLabel}{" "}
                <span className="text-xs font-normal text-muted-foreground">optional</span>
              </Label>
              <Input
                id="edit-cf-deposit-fee"
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
            <Label htmlFor="edit-cf-notes">Notes (optional)</Label>
            <Textarea
              id="edit-cf-notes"
              placeholder="Additional details..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

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
