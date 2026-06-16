"use client"

import type { FormEvent } from "react"

import type { CashFlow } from "@/lib/types"
import { useEffect, useMemo, useState } from "react"
import { SingleDatePicker } from "@/components/filters/single-date-picker"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MoneyHeroInput } from "@/components/cash-flows/money-hero-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DialogScrollBody } from "@/components/ui/dialog-scroll-body"
import { NotesTextarea } from "@/components/ui/notes-textarea"
import { createCashFlow, deleteCashFlow, updateCashFlow } from "@/lib/api/cash-flows"
import {
  feeTypeForCashFlowType,
  findLinkedDepositFee,
  parsePositiveFee,
} from "@/lib/cash-flows/deposit-fee-utils"
import {
  computeCopFromNetUsd,
  computeHapiDepositBreakdown,
} from "@/lib/cash-flows/hapi-deposit-calculator"
import { toDateInputValue } from "@/lib/date-utils"
import { showToast } from "@/lib/toast"

interface EditCashFlowDialogProps {
  cashFlow: CashFlow
  cashFlows: CashFlow[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function normalizeNetUsd(cashFlow: CashFlow): string {
  if (cashFlow.type !== "withdrawal") return cashFlow.usd_amount || ""
  return cashFlow.usd_amount.startsWith("-") ? cashFlow.usd_amount.slice(1) : cashFlow.usd_amount
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
    amount: cashFlow.amount,
    fx_rate: cashFlow.fx_rate || "",
    deposit_fee_usd: linkedFee?.amount ?? "",
    net_usd: normalizeNetUsd(cashFlow),
    notes: cashFlow.notes || "",
  })

  useEffect(() => {
    if (!open) return
    const fee = findLinkedDepositFee(cashFlows, cashFlow.id)
    setFormData({
      date: toDateInputValue(cashFlow.date),
      type: cashFlow.type,
      amount: cashFlow.amount,
      fx_rate: cashFlow.fx_rate || "",
      deposit_fee_usd: fee?.amount ?? "",
      net_usd: normalizeNetUsd(cashFlow),
      notes: cashFlow.notes || "",
    })
  }, [open, cashFlow, cashFlows])

  const isTransfer = formData.type === "deposit" || formData.type === "withdrawal"
  const transferBreakdown = computeHapiDepositBreakdown({
    netUsd: formData.net_usd,
    feeUsd: formData.deposit_fee_usd,
    fxRate: formData.fx_rate,
  })
  const feeLabel = formData.type === "withdrawal" ? "Withdrawal fee USD" : "Deposit fee USD"
  const netUsdLabel =
    formData.type === "withdrawal" ? "USD debited from Hapi" : "Deposit amount"
  const transferAmount = computeCopFromNetUsd({
    netUsd: formData.net_usd,
    feeUsd: formData.deposit_fee_usd,
    fxRate: formData.fx_rate,
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (formData.type === "cash_adjustment" && !formData.notes.trim()) {
      showToast.error("Cash adjustment requires notes")
      return
    }
    setIsLoading(true)

    try {
      await updateCashFlow(cashFlow.id, {
        date: formData.date,
        type: formData.type as "deposit" | "withdrawal" | "fee" | "cash_adjustment",
        currency: isTransfer ? "COP" : "USD",
        amount: isTransfer ? transferAmount : formData.amount,
        fx_rate: isTransfer ? formData.fx_rate : null,
        fee_type: formData.type === "fee" ? cashFlow.fee_type : null,
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
            notes: `${feeLabel} for ${formData.date}`,
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
      <DialogContent className="flex max-h-[90vh] max-w-[calc(100%-2rem)] flex-col gap-0 p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>Edit Cash Flow</DialogTitle>
          <DialogDescription>Update the cash flow details</DialogDescription>
        </DialogHeader>
        <DialogScrollBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isTransfer && (
              <MoneyHeroInput
                id="edit-cf-net-usd"
                label={netUsdLabel}
                value={formData.net_usd}
                onChange={(net_usd) => setFormData({ ...formData, net_usd })}
                required
              />
            )}

            {!isTransfer && formData.type !== "fee" && (
              <MoneyHeroInput
                id="edit-cf-amount"
                label="Amount (USD)"
                value={formData.amount}
                onChange={(amount) => setFormData({ ...formData, amount })}
                placeholder="10.00"
                required
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-cf-type">Type</Label>
                {formData.type === "fee" ? (
                  <p id="edit-cf-type" className="flex h-9 items-center text-sm font-mono">
                    Fee (linked)
                  </p>
                ) : (
                  <Select
                    value={formData.type}
                    onValueChange={(value: "deposit" | "withdrawal" | "cash_adjustment") =>
                      setFormData({
                        ...formData,
                        type: value,
                        deposit_fee_usd: "",
                        net_usd: "",
                      })
                    }
                  >
                    <SelectTrigger id="edit-cf-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deposit">Deposit</SelectItem>
                      <SelectItem value="withdrawal">Withdrawal</SelectItem>
                      <SelectItem value="cash_adjustment">Cash adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <SingleDatePicker
                id="edit-cf-date"
                label="Date"
                ariaLabel="Cash flow date"
                value={formData.date}
                onChange={(date) => setFormData({ ...formData, date })}
                required
              />
            </div>

            {isTransfer && (
              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label htmlFor="edit-cf-fx-rate">FX rate COP/USD</Label>
                  <Input
                    id="edit-cf-fx-rate"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="3532.531"
                    value={formData.fx_rate}
                    onChange={(e) => setFormData({ ...formData, fx_rate: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}

            {isTransfer && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Subtotal USD (net + fee):{" "}
                  <span className="font-mono font-semibold text-foreground">${transferBreakdown.subtotalUsd}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  COP to wire:{" "}
                  <span className="font-mono font-semibold text-foreground">${transferBreakdown.copToWire}</span>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-cf-notes">
                Notes {formData.type === "cash_adjustment" ? "(required)" : "(optional)"}
              </Label>
              <NotesTextarea
                id="edit-cf-notes"
                placeholder={
                  formData.type === "cash_adjustment"
                    ? "Adjust buy power without changing deposit history"
                    : "Additional details..."
                }
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                required={formData.type === "cash_adjustment"}
              />
              {formData.type === "cash_adjustment" && (
                <p className="text-xs text-muted-foreground">
                  Adjust buy power without changing deposit history.
                </p>
              )}
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
        </DialogScrollBody>
      </DialogContent>
    </Dialog>
  )
}
