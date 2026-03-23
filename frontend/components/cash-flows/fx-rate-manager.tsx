"use client"

import type React from "react"

import type { FxRate } from "@/lib/types"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
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
import { ArrowLeftRight, DollarSign, RefreshCw } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { createFxRate, fetchCurrentRate } from "@/lib/api/fx-rates"

type Direction = "USD_TO_COP" | "COP_TO_USD"

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

  const isInverse = direction === "COP_TO_USD"
  const rateLabel = isInverse ? "Rate (USD per 1 COP)" : "Rate (COP per 1 USD)"
  const ratePlaceholder = isInverse ? "0.000239" : "4185"
  const rateStep = isInverse ? "0.000001" : "0.01"

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
      // The DB always stores the canonical COP-per-1-USD rate.
      // When working in COP→USD direction, invert the user's input before saving.
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 bg-transparent">
          <DollarSign className="h-4 w-4" />
          FX Rates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage FX Rates</DialogTitle>
          <DialogDescription>Add historical exchange rates between USD and COP</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Direction toggle */}
          <div className="flex items-center justify-center gap-3">
            <span className={`text-sm font-medium ${!isInverse ? "text-foreground" : "text-muted-foreground"}`}>
              USD → COP
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={handleSwapDirection}
              title="Swap conversion direction"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
            <span className={`text-sm font-medium ${isInverse ? "text-foreground" : "text-muted-foreground"}`}>
              COP → USD
            </span>
          </div>

          {/* Fetch button */}
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={handleFetchCurrentRate}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching
              ? "Fetching..."
              : `Fetch Current Rate (${isInverse ? "COP → USD" : "USD → COP"})`}
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
              The rate will be converted to COP/USD before saving to keep calculations consistent.
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Rate"}
            </Button>
          </div>
        </form>

        {safeRecentRates.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">
              Recent Rates{" "}
              <span className="text-muted-foreground font-normal">
                ({isInverse ? "USD per 1 COP" : "COP per 1 USD"})
              </span>
            </h4>
            <Card>
              <CardContent className="p-3 space-y-2">
                {safeRecentRates.slice(0, 5).map((rate) => {
                  const canonical = Number(rate.rate)
                  const displayed = isInverse
                    ? (canonical > 0 ? 1 / canonical : 0).toFixed(6)
                    : canonical.toFixed(2)
                  return (
                    <div key={rate.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{new Date(rate.date).toLocaleDateString()}</span>
                      <span className="font-mono font-semibold">{displayed}</span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
