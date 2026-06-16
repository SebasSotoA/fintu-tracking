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
  feeTypeForCashFlowType,
  parsePositiveFee,
} from "@/lib/cash-flows/deposit-fee-utils"
import {
  computeCopFromNetUsd,
  computeHapiDepositBreakdown,
} from "@/lib/cash-flows/hapi-deposit-calculator"
import { showToast } from "@/lib/toast"

const emptyForm = () => ({
  date: new Date().toISOString().split("T")[0],
  type: "deposit" as "deposit" | "withdrawal" | "cash_adjustment",
  amount: "",
  fx_rate: "",
  deposit_fee_usd: "",
  net_usd: "",
  notes: "",
})

export function AddCashFlowDialog() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState(emptyForm)

  const isTransfer = formData.type === "deposit" || formData.type === "withdrawal"
  const transferBreakdown = computeHapiDepositBreakdown({
    netUsd: formData.net_usd,
    feeUsd: formData.deposit_fee_usd,
    fxRate: formData.fx_rate,
  })
  const standaloneUsdAmount = formData.amount.trim() ? formData.amount : "0.00"
  const feeLabel = formData.type === "withdrawal" ? "Withdrawal fee USD" : "Deposit fee USD"
  const netInputLabel = formData.type === "withdrawal" ? "USD debited from Hapi" : "USD to receive in Hapi"
  const netPreviewLabel = formData.type === "withdrawal" ? "USD debited from Hapi" : "USD credited to buy power"
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
      const deposit = await createCashFlow({
        date: formData.date,
        type: formData.type,
        currency: isTransfer ? "COP" : "USD",
        amount: isTransfer ? transferAmount : formData.amount,
        fx_rate: isTransfer ? formData.fx_rate : null,
        fee_type: null,
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
            notes: `${feeLabel} for ${formData.date}`,
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
      <DialogContent className="flex max-h-[90vh] max-w-xl flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>Add Cash Flow</DialogTitle>
          <DialogDescription>Record a deposit, withdrawal, or cash adjustment</DialogDescription>
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
                onValueChange={(value: "deposit" | "withdrawal" | "cash_adjustment") =>
                  setFormData({
                    ...formData,
                    type: value,
                    deposit_fee_usd: "",
                    net_usd: "",
                  })
                }
              >
                <SelectTrigger id="cf-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="cash_adjustment">Cash adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isTransfer && (
            <div className="space-y-2">
              <Label htmlFor="cf-net-usd">{netInputLabel}</Label>
              <Input
                id="cf-net-usd"
                type="number"
                step="0.01"
                min="0"
                placeholder="100.00"
                value={formData.net_usd}
                onChange={(e) => setFormData({ ...formData, net_usd: e.target.value })}
                required
              />
            </div>
          )}

          {!isTransfer && (
            <div className="space-y-2">
              <Label htmlFor="cf-amount">Amount (USD)</Label>
              <Input
                id="cf-amount"
                type="number"
                step="0.01"
                placeholder="10.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
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

          {isTransfer && (
            <div className="space-y-2">
              <Label htmlFor="cf-fx-rate">FX rate COP/USD</Label>
              <Input
                id="cf-fx-rate"
                type="number"
                step="0.01"
                min="0"
                placeholder="3532.531"
                value={formData.fx_rate}
                onChange={(e) => setFormData({ ...formData, fx_rate: e.target.value })}
                required
              />
            </div>
          )}

          <div className="space-y-1">
            {isTransfer ? (
              <>
                <Label>{netPreviewLabel}</Label>
                <div className="text-2xl font-bold font-mono">${transferBreakdown.netUsd}</div>
                <p className="text-sm text-muted-foreground">
                  Subtotal USD (net + fee):{" "}
                  <span className="font-mono font-semibold text-foreground">${transferBreakdown.subtotalUsd}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {feeLabel}: <span className="font-mono text-foreground">${transferBreakdown.feeUsd}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  COP to wire:{" "}
                  <span className="font-mono font-semibold text-foreground">${transferBreakdown.copToWire}</span>
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
            <Label htmlFor="cf-notes">
              Notes {formData.type === "cash_adjustment" ? "(required)" : "(optional)"}
            </Label>
            <NotesTextarea
              id="cf-notes"
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
