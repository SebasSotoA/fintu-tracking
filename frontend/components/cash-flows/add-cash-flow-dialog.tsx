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
import { useLocale } from "@/components/locale-provider"
import { showToast } from "@/lib/toast"

const emptyForm = () => ({
  date: new Date().toISOString().split("T")[0],
  type: "deposit" as "deposit" | "withdrawal",
  amount: "",
  fx_rate: "",
  deposit_fee_usd: "",
  net_usd: "",
  broker_id: MARKET_CONFIG.defaultBrokerId as string,
  notes: "",
})

export function AddCashFlowDialog({ autoOpen = false, children }: { autoOpen?: boolean; children?: React.ReactNode }) {
  const { t } = useLocale()
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
  const feeLabel =
    formData.type === "withdrawal"
      ? t("cash.withdrawalFee", { currency: MARKET_CONFIG.baseCurrency })
      : t("cash.depositFee", { currency: MARKET_CONFIG.baseCurrency })
  const netUsdLabel =
    formData.type === "withdrawal"
      ? t("cash.usdDebited", { currency: MARKET_CONFIG.baseCurrency })
      : t("cash.depositAmount")
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
            notes: t("cash.feeNote", { label: feeLabel, date: formData.date }),
          })
        } catch {
          showToast.error(t("cash.feeSavedFailed"))
          await invalidateAfterCashFlowMutation(queryClient)
          router.refresh()
          return
        }
      }

      showToast.success(t("cash.added"))
      setOpen(false)
      setFormData(emptyForm())
      await invalidateAfterCashFlowMutation(queryClient)
      router.refresh()
    } catch (err) {
      showToast.error(
        err instanceof Error ? err.message : t("cash.addFailed"),
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
          {children ?? t("cash.add")}
        </Button>
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="flex max-h-[100dvh] md:max-h-[90vh] max-w-[calc(100%-2rem)] flex-col gap-0 p-0 sm:max-w-3xl">
        <ResponsiveDialogHeader className="shrink-0 px-6 pt-6">
          <ResponsiveDialogTitle>{t("cash.add")}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{t("cash.addDescription")}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <DialogScrollBody>
          <form id="add-cash-flow-form" onSubmit={handleSubmit} className="space-y-4">
          <ResponsiveFormGrid className="md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="cf-type">{t("cash.type")}</Label>
              <Select
                value={formData.type}
                onValueChange={(value: "deposit" | "withdrawal") =>
                  setFormData({
                    ...formData,
                    type: value,
                    deposit_fee_usd: "",
                    net_usd: "",
                  })
                }
              >
                <SelectTrigger id="cf-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">{t("cash.deposit")}</SelectItem>
                  <SelectItem value="withdrawal">{t("cash.withdrawal")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SingleDatePicker
              id="cf-date"
              label={t("cash.date")}
              ariaLabel={t("cash.cashFlowDate")}
              value={formData.date}
              onChange={(date) => setFormData({ ...formData, date })}
              required
            />
            <BrokerSelect
              id="cf-broker"
              value={formData.broker_id}
              onChange={(value) => setFormData({ ...formData, broker_id: value })}
            />
          </ResponsiveFormGrid>

          {isTransfer && (
            <MoneyHeroInput
              id="cf-net-usd"
              label={netUsdLabel}
              value={formData.net_usd}
              onChange={(net_usd) => setFormData({ ...formData, net_usd })}
              required
            />
          )}

          {isTransfer && (
            <ResponsiveFormGrid>
              <div className="space-y-2">
                <Label htmlFor="cf-deposit-fee">
                  {feeLabel}{" "}
                  <span className="text-xs font-normal text-muted-foreground">{t("cash.optional")}</span>
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
                <Label htmlFor="cf-fx-rate">{t("cash.fxRate", { pair: formatCurrencyPair(MARKET_CONFIG.localCurrency, MARKET_CONFIG.baseCurrency) })}</Label>
                <Input
                  id="cf-fx-rate"
                  type="number"
                  step="0.0001"
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
            <div className="space-y-2">
              <Label>{t("cash.totalLabel", { currency: MARKET_CONFIG.baseCurrency })}</Label>
              <div className="text-2xl font-bold font-mono">${transferBreakdown.subtotalUsd}</div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cf-notes">
              {t("cash.notes")} <span className="text-xs font-normal text-muted-foreground">({t("cash.optional")})</span>
            </Label>
            <NotesTextarea
              id="cf-notes"
              placeholder={t("cash.notesPlaceholder")}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
          </form>
        </DialogScrollBody>
        <div className="flex shrink-0 flex-col-reverse gap-2 px-6 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
            {t("cash.cancel")}
          </Button>
          <Button type="submit" form="add-cash-flow-form" disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? t("cash.adding") : t("cash.add")}
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
