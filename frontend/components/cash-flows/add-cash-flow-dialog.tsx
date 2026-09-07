"use client"

import type { FormEvent } from "react"

import { useState } from "react"
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
import { FeeAmountInput } from "@/components/cash-flows/fee-amount-input"
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
  feeInputToUsd,
  type FeeUnit,
} from "@/lib/cash-flows/deposit-calculator"
import { BrokerSelect } from "@/components/brokers/broker-select"
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

export function AddCashFlowDialog({
  autoOpen = false,
  children,
  "data-tour": dataTour,
}: {
  autoOpen?: boolean
  children?: React.ReactNode
  "data-tour"?: string
}) {
  const { t } = useLocale()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(autoOpen)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState(emptyForm)
  const [feeUnit, setFeeUnit] = useState<FeeUnit>("usd")

  const isTransfer = formData.type === "deposit" || formData.type === "withdrawal"
  const feeUsd = feeInputToUsd(formData.net_usd, formData.deposit_fee_usd, feeUnit)
  const transferBreakdown = computeDepositBreakdown({
    netUsd: formData.net_usd,
    feeUsd,
    fxRate: formData.fx_rate,
  })
  const feeAmountCurrency = feeUnit === "percent" ? "%" : MARKET_CONFIG.baseCurrency
  const feeLabel =
    formData.type === "withdrawal"
      ? t("cash.withdrawalFee", { currency: feeAmountCurrency })
      : t("cash.depositFee", { currency: feeAmountCurrency })
  const netUsdLabel =
    formData.type === "withdrawal"
      ? t("cash.usdDebited", { currency: MARKET_CONFIG.baseCurrency })
      : t("cash.depositAmount")
  const netUsdHelp =
    formData.type === "withdrawal" ? t("cash.usdDebitedHelp") : t("cash.depositAmountHelp")
  const netUsdHelpLabel =
    formData.type === "withdrawal" ? t("cash.aboutUsdDebited") : t("cash.aboutDepositAmount")
  const transferAmount = computeCopFromNetUsd({
    netUsd: formData.net_usd,
    feeUsd,
    fxRate: formData.fx_rate,
  })
  const showFeeUsdEquivalent =
    feeUnit === "percent" && Boolean(formData.net_usd.trim()) && Boolean(formData.deposit_fee_usd.trim())

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

      const feeAmount = isTransfer ? parsePositiveFee(feeUsd) : null
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
      setFeeUnit("usd")
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
        <Button className="gap-2 w-full md:w-auto" data-tour={dataTour}>
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
                onValueChange={(value: "deposit" | "withdrawal") => {
                  setFeeUnit("usd")
                  setFormData({
                    ...formData,
                    type: value,
                    deposit_fee_usd: "",
                    net_usd: "",
                  })
                }}
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
              help={netUsdHelp}
              helpLabel={netUsdHelpLabel}
              required
            />
          )}

          {isTransfer && (
            <ResponsiveFormGrid>
              <FeeAmountInput
                id="cf-deposit-fee"
                label={feeLabel}
                value={formData.deposit_fee_usd}
                onChange={(deposit_fee_usd) => setFormData({ ...formData, deposit_fee_usd })}
                feeUnit={feeUnit}
                onFeeUnitChange={setFeeUnit}
                equivalentHint={
                  showFeeUsdEquivalent ? t("cash.feeUsdEquivalent", { amount: feeUsd }) : undefined
                }
              />
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
              <p id="cf-subtotal-label" className="text-sm leading-none font-medium">
                {t("cash.totalLabel", { currency: MARKET_CONFIG.baseCurrency })}
              </p>
              <p className="text-2xl font-bold font-mono" aria-labelledby="cf-subtotal-label">
                ${transferBreakdown.subtotalUsd}
              </p>
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
