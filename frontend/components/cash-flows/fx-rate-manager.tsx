"use client"

import { Decimal } from "@/lib/decimal"
import { useEffect, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { ArrowLeftRight, RefreshCw } from "lucide-react"
import { queryKeys } from "@/lib/api/query-keys"
import { fetchCurrentRate, getFxRateChart } from "@/lib/api/fx-rates"
import { FxRateSparkline } from "@/components/cash-flows/fx-rate-sparkline"
import { MARKET_CONFIG, formatCurrencyPair } from "@/lib/market-config/market-config"

type ConvertLastEdited = "base" | "local"

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

function formatLocalAmount(d: Decimal): string {
  return d.toFixed(2)
}

function formatBaseAmount(d: Decimal): string {
  return d.toFixed(2)
}

export function FxRateManager() {
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [convertBase, setConvertBase] = useState("1")
  const [convertLocal, setConvertLocal] = useState("")
  const [, setConvertLastEdited] = useState<ConvertLastEdited>("base")

  const { data: currentRate } = useQuery({
    queryKey: queryKeys.fxCurrentRate(),
    queryFn: () => fetchCurrentRate(),
    staleTime: 5 * 60 * 1000,
  })

  const latestRate = currentRate?.rate
  const canonical = latestRate ? Number(latestRate) : 0

  const {
    data: chartPoints = [],
    isLoading: isChartLoading,
    isFetching: isChartFetching,
  } = useQuery({
    queryKey: queryKeys.fxRateChart(MARKET_CONFIG.defaultFxRateDays),
    queryFn: () => getFxRateChart(MARKET_CONFIG.defaultFxRateDays),
    staleTime: 5 * 60 * 1000,
  })

  const showChartLoading = isChartLoading || (isChartFetching && chartPoints.length === 0)

  const handleRefreshRate = async () => {
    setIsRefreshing(true)
    setError(null)
    try {
      await fetchCurrentRate()
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.fxCurrentRate() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.fxRateChart() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.netWorth() }),
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch exchange rate")
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (!latestRate || canonical <= 0) return
    const rate = new Decimal(latestRate)
    setConvertBase("1")
    setConvertLocal(formatLocalAmount(new Decimal(1).mul(rate)))
    setConvertLastEdited("base")
  }, [currentRate?.date, latestRate, canonical])

  const handleConvertBaseChange = (raw: string) => {
    const value = sanitizeDecimalInput(raw)
    setConvertBase(value)
    setConvertLastEdited("base")
    const parsed = parsePositiveDecimal(value)
    if (!latestRate) return
    const rate = new Decimal(latestRate)
    if (parsed) {
      setConvertLocal(formatLocalAmount(parsed.mul(rate)))
    } else if (value.trim() === "") {
      setConvertLocal("")
    }
  }

  const handleConvertLocalChange = (raw: string) => {
    const value = sanitizeDecimalInput(raw)
    setConvertLocal(value)
    setConvertLastEdited("local")
    const parsed = parsePositiveDecimal(value)
    if (!latestRate) return
    const rate = new Decimal(latestRate)
    if (parsed) {
      setConvertBase(formatBaseAmount(parsed.div(rate)))
    } else if (value.trim() === "") {
      setConvertBase("")
    }
  }

  return (
    <div className="w-full rounded-2xl border border-border bg-surface-container-high p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {formatCurrencyPair(MARKET_CONFIG.baseCurrency, MARKET_CONFIG.localCurrency)}
          </h2>
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

      {(!latestRate || canonical <= 0) && (
        <div className="mb-6 rounded-xl border border-dashed border-border bg-surface-container p-8 text-center">
          <p className="mb-4 text-muted-foreground">No exchange rate on file yet.</p>
          <Button type="button" variant="secondary" disabled={isRefreshing} onClick={handleRefreshRate}>
            {isRefreshing ? "Fetching rate…" : "Fetch rate"}
          </Button>
        </div>
      )}

      {latestRate && canonical > 0 && (
        <div className="mb-6 flex flex-col items-stretch gap-4 md:flex-row md:items-center">
            <div className="flex min-h-[5.5rem] flex-1 flex-col justify-center rounded-xl border border-border bg-surface-container p-4">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {MARKET_CONFIG.baseCurrencyLabel}
              </span>
              <input
                id="fx-card-base"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                aria-label={`Amount in ${MARKET_CONFIG.baseCurrency}`}
                className="mt-1 w-full cursor-text border-0 bg-transparent p-0 font-mono text-2xl font-semibold tabular-nums text-foreground outline-none focus:outline-none focus-visible:outline-none"
                value={convertBase}
                onChange={(e) => handleConvertBaseChange(e.target.value)}
              />
              <span className="text-xs text-muted-foreground">{MARKET_CONFIG.baseCurrency}</span>
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
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {MARKET_CONFIG.localCurrencyLabel}
              </span>
              <input
                id="fx-card-local"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                aria-label={`Amount in ${MARKET_CONFIG.localCurrency}`}
                className="mt-1 w-full cursor-text border-0 bg-transparent p-0 font-mono text-2xl font-semibold tabular-nums text-foreground outline-none focus:outline-none focus-visible:outline-none"
                value={convertLocal}
                onChange={(e) => handleConvertLocalChange(e.target.value)}
              />
              <span className="text-xs text-muted-foreground">{MARKET_CONFIG.localCurrency}</span>
            </div>
          </div>
      )}

      <FxRateSparkline points={chartPoints} isLoading={showChartLoading} />
    </div>
  )
}
