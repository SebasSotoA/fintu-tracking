"use client"

import type React from "react"

import type { Trade } from "@/lib/types"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DialogScrollBody } from "@/components/ui/dialog-scroll-body"
import { ResponsiveFormGrid } from "@/components/ui/responsive-form-grid"
import { NotesTextarea } from "@/components/ui/notes-textarea"
import { SingleDatePicker } from "@/components/filters/single-date-picker"
import { SellTickerSelect } from "@/components/trades/sell-ticker-select"
import { TickerSearch } from "@/components/trades/ticker-search"
import { CircleHelp } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { updateTrade } from "@/lib/api/trades"
import { getHoldings } from "@/lib/api/portfolio"
import { toDateInputValue } from "@/lib/date-utils"
import { Decimal } from "@/lib/decimal"
import { BrokerSelect } from "@/components/brokers/broker-select"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"
import { useLocale } from "@/components/locale-provider"
import {
  buildTradePayload,
  calculateTradeTotal,
  tradeClosingFeeForForm,
  type TradeFormValues,
  validateSellQuantity,
} from "@/lib/trades/trade-form-utils"
import { showToast } from "@/lib/toast"

interface EditTradeDialogProps {
  trade: Trade
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function tradeToFormValues(trade: Trade): TradeFormValues {
  return {
    date: toDateInputValue(trade.date),
    ticker: trade.ticker,
    asset_type:
      trade.asset_type === "etf"
        ? "etf"
        : trade.asset_type === "crypto"
          ? "crypto"
          : "stock",
    side: trade.side,
    quantity: new Decimal(trade.quantity).toString(),
    price: new Decimal(trade.price).toString(),
    closing_fee: tradeClosingFeeForForm(trade),
    broker_id: trade.broker_id || (MARKET_CONFIG.defaultBrokerId as string),
    notes: trade.notes || "",
  }
}

export function EditTradeDialog({ trade, open, onOpenChange, onSuccess }: EditTradeDialogProps) {
  const { t } = useLocale()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<TradeFormValues>(() => tradeToFormValues(trade))
  // Existing trades start locked (asset type is known from stored trade).
  const [assetTypeLocked, setAssetTypeLocked] = useState(true)

  useEffect(() => {
    if (open) {
      setFormData(tradeToFormValues(trade))
      setAssetTypeLocked(true)
      setError(null)
    }
  }, [open, trade])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const holdings = await getHoldings()
      const sellError = validateSellQuantity(
        holdings,
        formData.ticker,
        formData.side,
        formData.quantity,
        trade,
      )
      if (sellError) {
        setError(t("trades.youHold", { qty: sellError.qty, ticker: sellError.ticker }))
        return
      }

      await updateTrade(trade.id, buildTradePayload(formData))

      showToast.success(t("trades.updated"))
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      showToast.error(
        err instanceof Error ? err.message : t("trades.updateFailed"),
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="flex max-h-[100dvh] md:max-h-[90vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <ResponsiveDialogHeader className="shrink-0 px-6 pt-6">
          <ResponsiveDialogTitle>{t("trades.editTitle")}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{t("trades.editDescription")}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <DialogScrollBody>
          <form id="edit-trade-form" onSubmit={handleSubmit} className="space-y-4">
            <ResponsiveFormGrid>
              <SingleDatePicker
                id="edit-date"
                label={t("trades.date")}
                ariaLabel={t("trades.tradeDate")}
                value={formData.date}
                onChange={(date) => setFormData({ ...formData, date })}
                required
              />
            {formData.side === "sell" ? (
              <SellTickerSelect
                id="edit-ticker"
                value={formData.ticker}
                onChange={(ticker, holding) => {
                  setAssetTypeLocked(true)
                  setFormData({
                    ...formData,
                    ticker,
                    asset_type:
                      holding?.assetType === "etf"
                        ? "etf"
                        : holding?.assetType === "crypto"
                          ? "crypto"
                          : "stock",
                  })
                }}
              />
            ) : (
              <TickerSearch
                id="edit-ticker"
                value={formData.ticker}
                onChange={(ticker, assetType) => {
                  if (assetType) {
                    setAssetTypeLocked(true)
                    setFormData({ ...formData, ticker, asset_type: assetType })
                  } else {
                    setAssetTypeLocked(false)
                    setFormData({ ...formData, ticker, asset_type: "stock" })
                  }
                }}
              />
            )}
          </ResponsiveFormGrid>

          <ResponsiveFormGrid className="md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="edit-asset_type">{t("trades.assetType")}</Label>
              <Select
                value={formData.asset_type}
                onValueChange={(value: "stock" | "etf" | "crypto") =>
                  setFormData({ ...formData, asset_type: value })
                }
                disabled={assetTypeLocked}
              >
                <SelectTrigger id="edit-asset_type" className="w-full" disabled={assetTypeLocked}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock">{t("trades.stock")}</SelectItem>
                  <SelectItem value="etf">{t("trades.etf")}</SelectItem>
                  <SelectItem value="crypto">{t("trades.crypto")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <BrokerSelect
              id="edit-broker"
              value={formData.broker_id}
              onChange={(value) => setFormData({ ...formData, broker_id: value })}
            />
            <div className="space-y-2">
              <Label htmlFor="edit-side">{t("trades.side")}</Label>
              <Select
                value={formData.side}
                onValueChange={(value: "buy" | "sell") => {
                  if (value === "sell") setAssetTypeLocked(false)
                  setFormData({
                    ...formData,
                    side: value,
                    ticker: value === "buy" ? formData.ticker : trade.side === "sell" ? formData.ticker : "",
                  })
                }}
              >
                <SelectTrigger id="edit-side" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">{t("trades.buy")}</SelectItem>
                  <SelectItem value="sell">{t("trades.sell")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </ResponsiveFormGrid>

          <ResponsiveFormGrid>
            <div className="space-y-2">
              <Label htmlFor="edit-quantity">{t("trades.quantity")}</Label>
              <Input
                id="edit-quantity"
                type="number"
                step="0.00000001"
                placeholder="10"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-price">{t("trades.price")}</Label>
              <Input
                id="edit-price"
                type="number"
                step="0.0001"
                placeholder="150.00"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>
          </ResponsiveFormGrid>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="edit-closing_fee">{t("trades.commission")}</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={t("trades.aboutCommission")}
                    className="inline-flex rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <CircleHelp className="size-3.5 shrink-0" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-pretty">
                  {t("trades.commissionHelp")}
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              id="edit-closing_fee"
              type="number"
              step="0.01"
              min="0"
              placeholder="0"
              value={formData.closing_fee}
              onChange={(e) => setFormData({ ...formData, closing_fee: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("trades.totalLabel", { currency: MARKET_CONFIG.baseCurrency })}</Label>
            <div className="text-2xl font-bold font-mono">${calculateTradeTotal(formData)}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">{t("trades.notesOptional")}</Label>
            <NotesTextarea
              id="edit-notes"
                placeholder={t("trades.notesPlaceholder")}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        </DialogScrollBody>
        <div className="flex shrink-0 flex-col-reverse gap-2 px-6 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            {t("trades.cancel")}
          </Button>
          <Button type="submit" form="edit-trade-form" disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? t("trades.saving") : t("trades.save")}
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
