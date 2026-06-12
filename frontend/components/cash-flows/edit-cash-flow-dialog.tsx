"use client"

import type { FormEvent } from "react"

import type { CashFlow } from "@/lib/types"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  computeCopToWireFromNetTarget,
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
    net_usd_target: "",
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
      net_usd_target: "",
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
  const transferBreakdown = computeHapiDepositBreakdown({
    copAmount: formData.amount,
    fxRate: formData.fx_rate,
    feeUsd: formData.deposit_fee_usd,
  })
  const standaloneUsdAmount = formData.amount.trim() ? formData.amount : "0.00"
  const feeLabel = formData.type === "withdrawal" ? "Withdrawal fee (USD)" : "Deposit fee (USD)"
  const netLabel = formData.type === "withdrawal" ? "USD debited from Hapi" : "USD credited to buy power"

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
      <DialogContent className="flex max-h-[90vh] max-w-md flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>Edit Cash Flow</DialogTitle>
          <DialogDescription>Update the cash flow details</DialogDescription>
        </DialogHeader>
        <DialogScrollBody>
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
                  setFormData({
                    ...formData,
                    type: value,
                    currency: value === "fee" ? "USD" : "COP",
                    deposit_fee_usd: "",
                    net_usd_target: "",
                  })
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
              <p id="edit-cf-currency" className="flex h-9 items-center text-sm font-mono">
                {isTransfer ? "COP" : "USD"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cf-amount">Amount ({isTransfer ? "COP" : "USD"})</Label>
              <Input
                id="edit-cf-amount"
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

          {isTransfer && (
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
              <Label htmlFor="edit-cf-net-target">
                Target {formData.type === "withdrawal" ? "USD debited" : "USD credited"} (optional)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="edit-cf-net-target"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="100.00"
                  value={formData.net_usd_target}
                  onChange={(e) => setFormData({ ...formData, net_usd_target: e.target.value })}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      amount: computeCopToWireFromNetTarget({
                        netUsdTarget: formData.net_usd_target,
                        feeUsd: formData.deposit_fee_usd,
                        fxRate: formData.fx_rate,
                      }),
                    })
                  }
                >
                  Fill COP
                </Button>
              </div>
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
            {isTransfer ? (
              <>
                <Label>{netLabel}</Label>
                <div className="text-2xl font-bold font-mono">${transferBreakdown.netUsdCredited}</div>
                <p className="text-sm text-muted-foreground">
                  Gross USD (COP / FX):{" "}
                  <span className="font-mono font-semibold text-foreground">${transferBreakdown.grossUsd}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {feeLabel}: <span className="font-mono text-foreground">${transferBreakdown.feeUsd}</span>
                </p>
              </>
            ) : (
              <>
                <Label>USD amount</Label>
                <div className="text-2xl font-bold font-mono">${standaloneUsdAmount}</div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-cf-notes">Notes (optional)</Label>
            <NotesTextarea
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
        </DialogScrollBody>
      </DialogContent>
    </Dialog>
  )
}
