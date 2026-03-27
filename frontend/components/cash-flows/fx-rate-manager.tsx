"use client"

import type React from "react"

import type { FxRate } from "@/lib/types"
import { Decimal } from "@/lib/decimal"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeftRight, Plus, RefreshCw } from "lucide-react"
import { createFxRate, fetchCurrentRate } from "@/lib/api/fx-rates"
import { FxRateSparkline } from "@/components/cash-flows/fx-rate-sparkline"

type Direction = "USD_TO_COP" | "COP_TO_USD"

type ConvertLastEdited = "usd" | "cop"

function parsePositiveDecimal(raw: string): Decimal | null {
  const t = raw.trim()
  if (t === "" || t === ".") return null
  try {
    const d = new Decimal(t)
    if (!d.isFinite() || d.lte(0)) return null
    return d
  } catch {
    return null
  }
}

/** Digits and at most one "." so letters/symbols cannot appear in the field. */
function sanitizeDecimalInput(raw: string): string {
  let out = ""
  let dotSeen = false
  for (const ch of raw) {
    if (ch >= "0" && ch <= "9") out += ch
    else if (ch === "." && !dotSeen) {
      out += ch
      dotSeen = true
    }
  }
  return out
}

/** Conversion display: COP and USD both use 2 decimal places. */
function formatCopAmount(d: Decimal): string {
  return d.toFixed(2)
}

function formatUsdAmount(d: Decimal): string {
  return d.toFixed(2)
}

interface FxRateManagerProps {
  recentRates: FxRate[]
}

export function FxRateManager({ recentRates }: FxRateManagerProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const safeRecentRates = recentRates || []
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [direction, setDirection] = useState<Direction>("USD_TO_COP")

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    rate: "",
  })

  const [convertUsd, setConvertUsd] = useState("1")
  const [convertCop, setConvertCop] = useState("")
  const [convertLastEdited, setConvertLastEdited] = useState<ConvertLastEdited>("usd")

  const isInverse = direction === "COP_TO_USD"
  const rateLabel = isInverse ? "Rate (USD per 1 COP)" : "Rate (COP per 1 USD)"
  const ratePlaceholder = isInverse ? "0.000239" : "4185"
  const rateStep = isInverse ? "0.000001" : "0.01"

  const latest = safeRecentRates[0]
  const canonical = latest ? Number(latest.rate) : 0

  useEffect(() => {
    if (!latest?.rate || canonical <= 0) return
    const rate = new Decimal(latest.rate)
    if (direction === "USD_TO_COP") {
      setConvertUsd("1")
      setConvertCop(formatCopAmount(new Decimal(1).mul(rate)))
      setConvertLastEdited("usd")
    } else {
      setConvertUsd(formatUsdAmount(new Decimal(1).div(rate)))
      setConvertCop("1")
      setConvertLastEdited("cop")
    }
  }, [direction, latest?.id, latest?.rate, canonical])

  const handleConvertUsdChange = (raw: string) => {
    const value = sanitizeDecimalInput(raw)
    setConvertUsd(value)
    setConvertLastEdited("usd")
    const parsed = parsePositiveDecimal(value)
    if (!latest?.rate) return
    const rate = new Decimal(latest.rate)
    if (parsed) {
      setConvertCop(formatCopAmount(parsed.mul(rate)))
    } else if (value.trim() === "") {
      setConvertCop("")
    }
  }

  const handleConvertCopChange = (raw: string) => {
    const value = sanitizeDecimalInput(raw)
    setConvertCop(value)
    setConvertLastEdited("cop")
    const parsed = parsePositiveDecimal(value)
    if (!latest?.rate) return
    const rate = new Decimal(latest.rate)
    if (parsed) {
      setConvertUsd(formatUsdAmount(parsed.div(rate)))
    } else if (value.trim() === "") {
      setConvertUsd("")
    }
  }

  const handleSwapDirection = () => {
    setDirection((prev) => (prev === "USD_TO_COP" ? "COP_TO_USD" : "USD_TO_COP"))
    setFormData((prev) => ({ ...prev, rate: "" }))
    setError(null)
  }

  const handleFetchCurrentRate = async () => {
    setIsFetching(true)
    setError(null)
    try {
      const params = isInverse ? { from: "COP", to: "USD" } : { from: "USD", to: "COP" }
      const current = await fetchCurrentRate(params)
      setFormData({ date: current.date, rate: current.rate })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch current rate")
    } finally {
      setIsFetching(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      let canonicalRate = formData.rate
      if (isInverse) {
        const parsed = parseFloat(formData.rate)
        if (!parsed || parsed <= 0) {
          setError("Rate must be a positive number")
          return
        }
        canonicalRate = (1 / parsed).toFixed(2)
      }

      await createFxRate({
        date: formData.date,
        rate: canonicalRate,
        source: "manual",
      })

      setOpen(false)
      setFormData({ date: new Date().toISOString().split("T")[0], rate: "" })
      router.refresh()
      queryClient.invalidateQueries({ queryKey: ["net-worth"] })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create FX rate")
    } finally {
      setIsLoading(false)
    }
  }

  const addRateForm = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-center gap-3">
        <span className={`text-sm font-medium ${!isInverse ? "text-foreground" : "text-muted-foreground"}`}>
          USD → COP
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full ring-2 ring-primary/25"
          onClick={handleSwapDirection}
          title="Swap conversion direction"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </Button>
        <span className={`text-sm font-medium ${isInverse ? "text-foreground" : "text-muted-foreground"}`}>
          COP → USD
        </span>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2 border-border bg-surface-container"
        onClick={handleFetchCurrentRate}
        disabled={isFetching}
      >
        <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        {isFetching ? "Fetching..." : `Fetch current rate (${isInverse ? "COP → USD" : "USD → COP"})`}
      </Button>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fx-date">Date</Label>
          <Input
            id="fx-date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fx-rate">{rateLabel}</Label>
          <Input
            id="fx-rate"
            type="number"
            step={rateStep}
            placeholder={ratePlaceholder}
            value={formData.rate}
            onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
            required
          />
        </div>
      </div>

      {isInverse && (
        <p className="text-xs text-muted-foreground">
          The rate will be converted to COP per USD before saving to keep calculations consistent.
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Adding…" : "Add rate"}
        </Button>
      </div>
    </form>
  )

  return (
    <>
      <div className="w-full rounded-2xl border border-border bg-surface-container-high p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">USD / COP</h2>
            <p className="text-sm text-muted-foreground">Exchange rate used for conversions</p>
          </div>
          <Button type="button" className="gap-2 shrink-0" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Add rate
          </Button>
        </div>

        {!latest || canonical <= 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface-container p-8 text-center">
            <p className="mb-4 text-muted-foreground">No exchange rate on file yet.</p>
            <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
              Add your first rate
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col items-stretch gap-4 md:flex-row md:items-center">
              <div className="flex min-h-[5.5rem] flex-1 flex-col justify-center rounded-xl border border-border bg-surface-container p-4">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">US Dollar</span>
                <input
                  id="fx-card-usd"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  aria-label="Amount in USD"
                  className="mt-1 w-full cursor-text border-0 bg-transparent p-0 font-mono text-2xl font-semibold tabular-nums text-foreground outline-none focus:outline-none focus-visible:outline-none"
                  value={convertUsd}
                  onChange={(e) => handleConvertUsdChange(e.target.value)}
                />
                <span className="text-xs text-muted-foreground">USD</span>
              </div>

              <div className="flex justify-center md:px-1" aria-hidden="true">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  tabIndex={-1}
                  className="pointer-events-none h-12 w-12 shrink-0 rounded-full ring-2 ring-primary/30 shadow-sm"
                >
                  <ArrowLeftRight className="h-5 w-5 text-primary" />
                </Button>
              </div>

              <div className="flex min-h-[5.5rem] flex-1 flex-col justify-center rounded-xl border border-border bg-surface-container p-4">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Colombian Peso</span>
                <input
                  id="fx-card-cop"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  aria-label="Amount in COP"
                  className="mt-1 w-full cursor-text border-0 bg-transparent p-0 font-mono text-2xl font-semibold tabular-nums text-foreground outline-none focus:outline-none focus-visible:outline-none"
                  value={convertCop}
                  onChange={(e) => handleConvertCopChange(e.target.value)}
                />
                <span className="text-xs text-muted-foreground">COP</span>
              </div>
            </div>

            <FxRateSparkline rates={safeRecentRates} />
          </>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add FX rate</DialogTitle>
            <DialogDescription>Add a historical exchange rate between USD and COP</DialogDescription>
          </DialogHeader>
          {addRateForm}
        </DialogContent>
      </Dialog>
    </>
  )
}
