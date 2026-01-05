"use client"

import type React from "react"

import type { FxRate } from "@/lib/types"
import { useState } from "react"
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
import { DollarSign } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { createFxRate } from "@/lib/api/fx-rates"

interface FxRateManagerProps {
  recentRates: FxRate[]
}

export function FxRateManager({ recentRates }: FxRateManagerProps) {
  // Ensure recentRates is a valid array
  const safeRecentRates = recentRates || []
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    rate: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      await createFxRate({
        date: formData.date,
        rate: formData.rate,
        source: "manual",
      })

      setOpen(false)
      setFormData({
        date: new Date().toISOString().split("T")[0],
        rate: "",
      })
      window.location.reload()
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
          <DialogDescription>Add historical COP/USD exchange rates</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="fx-rate">Rate (COP/USD)</Label>
              <Input
                id="fx-rate"
                type="number"
                step="0.01"
                placeholder="4000"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                required
              />
            </div>
          </div>

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
            <h4 className="text-sm font-semibold">Recent Rates</h4>
            <Card>
              <CardContent className="p-3 space-y-2">
                {safeRecentRates.slice(0, 5).map((rate) => (
                  <div key={rate.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{new Date(rate.date).toLocaleDateString()}</span>
                    <span className="font-mono font-semibold">{Number(rate.rate).toFixed(2)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
