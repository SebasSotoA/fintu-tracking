"use client"

import type { FxRate } from "@/lib/types"
import type { FxRateChartPoint } from "@/lib/api/fx-rates"
import { Decimal } from "@/lib/decimal"
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { ArrowLeftRight, RefreshCw } from "lucide-react"
import { fetchCurrentRate, getFxRateChart } from "@/lib/api/fx-rates"
import { FxRateSparkline } from "@/components/cash-flows/fx-rate-sparkline"

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
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chartPoints, setChartPoints] = useState<FxRateChartPoint[]>([])

  const [convertUsd, setConvertUsd] = useState("1")
  const [convertCop, setConvertCop] = useState("")
  const [convertLastEdited, setConvertLastEdited] = useState<ConvertLastEdited>("usd")

  const latest = safeRecentRates[0]
  const canonical = latest ? Number(latest.rate) : 0

  const loadChart = useCallback(async () => {
    try {
      const points = await getFxRateChart(30)
      setChartPoints(points)
    } catch {
      setChartPoints([])
    }
  }, [])

  useEffect(() => {
    void loadChart()
  }, [loadChart])

  const handleRefreshRate = async () => {
    setIsRefreshing(true)
    setError(null)
    try {
      await fetchCurrentRate()
      await loadChart()
      router.refresh()
      queryClient.invalidateQueries({ queryKey: ["net-worth"] })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch exchange rate")
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (!latest?.rate || canonical <= 0) return
    const rate = new Decimal(latest.rate)
    setConvertUsd("1")
    setConvertCop(formatCopAmount(new Decimal(1).mul(rate)))
    setConvertLastEdited("usd")
  }, [latest?.id, latest?.rate, canonical])

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

  return (
    <div className="w-full rounded-2xl border border-border bg-surface-container-high p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">USD / COP</h2>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-2"
          disabled={isRefreshing}
          onClick={handleRefreshRate}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Fetching…" : "Refresh rate"}
        </Button>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {(!latest || canonical <= 0) && (
        <div className="mb-6 rounded-xl border border-dashed border-border bg-surface-container p-8 text-center">
          <p className="mb-4 text-muted-foreground">No exchange rate on file yet.</p>
          <Button type="button" variant="secondary" disabled={isRefreshing} onClick={handleRefreshRate}>
            {isRefreshing ? "Fetching rate…" : "Fetch rate"}
          </Button>
        </div>
      )}

      {latest && canonical > 0 && (
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
      )}

      <FxRateSparkline points={chartPoints} />
    </div>
  )
}
