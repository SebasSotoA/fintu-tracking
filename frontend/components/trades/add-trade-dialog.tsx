"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog"
import { DialogScrollBody } from "@/components/ui/dialog-scroll-body"
import { ResponsiveFormGrid } from "@/components/ui/responsive-form-grid"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NotesTextarea } from "@/components/ui/notes-textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SingleDatePicker } from "@/components/filters/single-date-picker"
import { SellTickerSelect } from "@/components/trades/sell-ticker-select"
import { Plus } from "lucide-react"
import { invalidateAfterTradeMutation } from "@/lib/api/query-keys"
import { createTrade } from "@/lib/api/trades"
import { getHoldings, getMarketPrice } from "@/lib/api/portfolio"
import { BrokerSelect } from "@/components/brokers/broker-select"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"
import {
  buildTradePayload,
  calculateTradeTotal,
  type TradeFormValues,
  validateSellQuantity,
} from "@/lib/trades/trade-form-utils"
import { showToast } from "@/lib/toast"

const emptyForm = (overrides?: {
  ticker?: string
  asset_type?: TradeFormValues["asset_type"]
  side?: TradeFormValues["side"]
}): TradeFormValues => ({
  date: new Date().toISOString().split("T")[0],
  ticker: overrides?.ticker ?? "",
  asset_type: overrides?.asset_type ?? "stock",
  side: overrides?.side ?? "buy",
  quantity: "",
  price: "",
  closing_fee: "",
  broker_id: MARKET_CONFIG.defaultBrokerId as string,
  notes: "",
})

interface AddTradeDialogProps {
  initialTicker?: string
  initialAssetType?: "stock" | "etf" | "crypto"
  initialSide?: "buy" | "sell"
  /** When true, auto-opens the dialog and hides the trigger button. Use for programmatic quick-trade. */
  autoOpen?: boolean
  children?: React.ReactNode
}

export function AddTradeDialog({ initialTicker, initialAssetType, initialSide, autoOpen, children }: AddTradeDialogProps = {}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(autoOpen ?? false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [priceWarning, setPriceWarning] = useState<string | null>(null)
  const overrides = { ticker: initialTicker, asset_type: initialAssetType, side: initialSide }
  const [formData, setFormData] = useState<TradeFormValues>(() => emptyForm(overrides))

  const handleTickerBlur = async () => {
    const ticker = formData.ticker.trim().toUpperCase()
    if (!ticker) {
      setPriceWarning(null)
      return
    }
    try {
      await getMarketPrice(ticker)
      setPriceWarning(null)
    } catch {
      setPriceWarning("No cached price yet — use Refresh Prices on the dashboard after saving.")
    }
  }

  const handleSubmit = async (e: FormEvent) => {
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
      )
      if (sellError) {
        setError(sellError)
        return
      }

      await createTrade(buildTradePayload(formData))

      showToast.success("Trade added")
      setOpen(false)
      setFormData(emptyForm(overrides))
      setPriceWarning(null)
      await invalidateAfterTradeMutation(queryClient)
      router.refresh()
    } catch (err) {
      showToast.error(
        err instanceof Error ? err.message : "Failed to add trade",
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (next) setFormData(emptyForm(overrides))
        setOpen(next)
      }}
    >
      {!autoOpen && (
        <ResponsiveDialogTrigger asChild>
          <Button className="gap-2 w-full md:w-auto">
            <Plus className="h-4 w-4" />
            {children ?? "Add Trade"}
          </Button>
        </ResponsiveDialogTrigger>
      )}
      <ResponsiveDialogContent className="flex max-h-[100dvh] md:max-h-[90vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <ResponsiveDialogHeader className="shrink-0 px-6 pt-6">
          <ResponsiveDialogTitle>Add Trade</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>Record a buy or sell for a stock, ETF, or crypto</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <DialogScrollBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <ResponsiveFormGrid>
              <SingleDatePicker
                id="date"
                label="Date"
                ariaLabel="Trade date"
                value={formData.date}
                onChange={(date) => setFormData({ ...formData, date })}
                required
              />
              {formData.side === "sell" ? (
                <SellTickerSelect
                  id="ticker"
                  value={formData.ticker}
                  onChange={(ticker, holding) => {
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
                    setPriceWarning(null)
                  }}
                />
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="ticker">Ticker</Label>
                  <Input
                    id="ticker"
                    placeholder="AAPL"
                    value={formData.ticker}
                    onChange={(e) => {
                      setFormData({ ...formData, ticker: e.target.value })
                      setPriceWarning(null)
                    }}
                    onBlur={handleTickerBlur}
                    required
                  />
                  {priceWarning && (
                    <p className="text-xs text-destructive">{priceWarning}</p>
                  )}
                </div>
              )}
            </ResponsiveFormGrid>

            <ResponsiveFormGrid>
              <div className="space-y-2">
                <Label htmlFor="asset_type">Asset Type</Label>
                <Select
                  value={formData.asset_type}
                  onValueChange={(value: "stock" | "etf" | "crypto") =>
                    setFormData({ ...formData, asset_type: value })
                  }
                >
                  <SelectTrigger id="asset_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stock">Stock</SelectItem>
                    <SelectItem value="etf">ETF</SelectItem>
                    <SelectItem value="crypto">Crypto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="side">Side</Label>
                <Select
                  value={formData.side}
                  onValueChange={(value: "buy" | "sell") =>
                  setFormData({
                    ...formData,
                    side: value,
                    ticker: value === "buy" ? formData.ticker : "",
                  })
                }
                >
                  <SelectTrigger id="side">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </ResponsiveFormGrid>

            <BrokerSelect
              id="broker"
              value={formData.broker_id}
              onChange={(value) => setFormData({ ...formData, broker_id: value })}
            />

            <ResponsiveFormGrid>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.00000001"
                  placeholder="10"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
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
              <Label htmlFor="closing_fee">Commission</Label>
              <Input
                id="closing_fee"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                value={formData.closing_fee}
                onChange={(e) => setFormData({ ...formData, closing_fee: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Mapped to trading fee for this trade.</p>
            </div>

            <div className="space-y-2">
              <Label>Total ({MARKET_CONFIG.baseCurrency})</Label>
              <div className="text-2xl font-bold font-mono">${calculateTradeTotal(formData)}</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <NotesTextarea
                id="notes"
                placeholder="Additional details..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? "Adding..." : "Add Trade"}
              </Button>
            </div>
          </form>
        </DialogScrollBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
