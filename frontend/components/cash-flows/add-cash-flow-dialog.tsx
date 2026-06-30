"use client"

import type { FormEvent } from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { invalidateAfterCashFlowMutation } from "@/lib/api/query-keys"
import { SingleDatePicker } from "@/components/filters/single-date-picker"
import { Button } from "@/components/ui/button"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog"
import { MoneyHeroInput } from "@/components/cash-flows/money-hero-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DialogScrollBody } from "@/components/ui/dialog-scroll-body"
import { ResponsiveFormGrid } from "@/components/ui/responsive-form-grid"
import { NotesTextarea } from "@/components/ui/notes-textarea"
import { Plus } from "lucide-react"
import { createCashFlow } from "@/lib/api/cash-flows"
import {
  feeTypeForCashFlowType,
  parsePositiveFee,
} from "@/lib/cash-flows/deposit-fee-utils"
import {
  computeCopFromNetUsd,
  computeDepositBreakdown,
} from "@/lib/cash-flows/deposit-calculator"
import { BrokerSelect } from "@/components/brokers/broker-select"
import { computeCashFlowBrokerFeeUSD } from "@/lib/brokers/broker-presets"
import { MARKET_CONFIG, formatCurrencyPair } from "@/lib/market-config/market-config"
import { showToast } from "@/lib/toast"

const emptyForm = () => ({
  date: new Date().toISOString().split("T")[0],
  type: "deposit" as "deposit" | "withdrawal" | "cash_adjustment",
  amount: "",
  fx_rate: "",
  deposit_fee_usd: "",
  net_usd: "",
  broker_id: MARKET_CONFIG.defaultBrokerId as string,
  notes: "",
})

export function AddCashFlowDialog({ autoOpen = false, children }: { autoOpen?: boolean; children?: React.ReactNode }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(autoOpen)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState(emptyForm)

  const isTransfer = formData.type === "deposit" || formData.type === "withdrawal"
  const transferBreakdown = computeDepositBreakdown({
    netUsd: formData.net_usd,
    feeUsd: formData.deposit_fee_usd,
    fxRate: formData.fx_rate,
  })
  const feeLabel = formData.type === "withdrawal" ? `Withdrawal fee ${MARKET_CONFIG.baseCurrency}` : `Deposit fee ${MARKET_CONFIG.baseCurrency}`
  const netUsdLabel =
    formData.type === "withdrawal" ? `${MARKET_CONFIG.baseCurrency} debited from broker` : "Deposit amount"
  const transferAmount = computeCopFromNetUsd({
    netUsd: formData.net_usd,
    feeUsd: formData.deposit_fee_usd,
    fxRate: formData.fx_rate,
  })

  useEffect(() => {
    if (!isTransfer) return
    const fee = computeCashFlowBrokerFeeUSD(formData.type, formData.broker_id, formData.net_usd)
    if (fee !== null) {
      setFormData((prev) => ({ ...prev, deposit_fee_usd: fee }))
    }
  }, [formData.broker_id, formData.type, formData.net_usd])

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
        currency: isTransfer ? MARKET_CONFIG.localCurrency : MARKET_CONFIG.baseCurrency,
        amount: isTransfer ? transferAmount : formData.amount,
        fx_rate: isTransfer ? formData.fx_rate : null,
        broker_id: formData.broker_id,
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
            currency: MARKET_CONFIG.baseCurrency,
            amount: feeAmount,
            fx_rate: null,
            broker_id: formData.broker_id,
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
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger asChild>
        <Button className="gap-2 w-full md:w-auto">
          <Plus className="h-4 w-4" />
          {children ?? "Add Cash Flow"}
        </Button>
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="flex max-h-[100dvh] md:max-h-[90vh] max-w-[calc(100%-2rem)] flex-col gap-0 p-0 sm:max-w-3xl">
        <ResponsiveDialogHeader className="shrink-0 px-6 pt-6">
          <ResponsiveDialogTitle>Add Cash Flow</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>Record a deposit, withdrawal, or cash adjustment</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <DialogScrollBody>
          <form onSubmit={handleSubmit} className="space-y-4">
          {isTransfer && (
            <MoneyHeroInput
              id="cf-net-usd"
              label={netUsdLabel}
              value={formData.net_usd}
              onChange={(net_usd) => setFormData({ ...formData, net_usd })}
              required
            />
          )}

          {!isTransfer && (
            <MoneyHeroInput
              id="cf-amount"
              label={`Amount (${MARKET_CONFIG.baseCurrency})`}
              value={formData.amount}
              onChange={(amount) => setFormData({ ...formData, amount })}
              placeholder="10.00"
              required
            />
          )}

          <ResponsiveFormGrid>
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
            <SingleDatePicker
              id="cf-date"
              label="Date"
              ariaLabel="Cash flow date"
              value={formData.date}
              onChange={(date) => setFormData({ ...formData, date })}
              required
            />
          </ResponsiveFormGrid>

          <BrokerSelect
            id="cf-broker"
            value={formData.broker_id}
            onChange={(value) => setFormData({ ...formData, broker_id: value })}
          />

          {isTransfer && (
            <ResponsiveFormGrid>
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
              <div className="space-y-2">
                <Label htmlFor="cf-fx-rate">FX rate {formatCurrencyPair(MARKET_CONFIG.localCurrency, MARKET_CONFIG.baseCurrency)}</Label>
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
            </ResponsiveFormGrid>
          )}

          {isTransfer && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Subtotal {MARKET_CONFIG.baseCurrency} (net + fee):{" "}
                <span className="font-mono font-semibold text-foreground">${transferBreakdown.subtotalUsd}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {MARKET_CONFIG.localCurrency} to wire:{" "}
                <span className="font-mono font-semibold text-foreground">${transferBreakdown.localAmount}</span>
              </p>
            </div>
          )}

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

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? "Adding..." : "Add Cash Flow"}
            </Button>
          </div>
          </form>
        </DialogScrollBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
