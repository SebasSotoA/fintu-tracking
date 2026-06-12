"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { getHoldings } from "@/lib/api/portfolio"
import type { Holding } from "@/lib/types"
import { cn } from "@/lib/utils"
import Decimal from "decimal.js"

interface SellTickerSelectProps {
  id: string
  value: string
  onChange: (ticker: string, holding?: Holding) => void
  disabled?: boolean
}

function filterOpenHoldings(rows: Holding[]): Holding[] {
  return rows.filter((h) => {
    try {
      return new Decimal(h.quantity).gt(0)
    } catch {
      return false
    }
  })
}

export function SellTickerSelect({ id, value, onChange, disabled }: SellTickerSelectProps) {
  const [open, setOpen] = useState(false)
  const { data: holdings = [] } = useQuery({
    queryKey: ["holdings"],
    queryFn: getHoldings,
    select: filterOpenHoldings,
    staleTime: 60_000,
  })

  const selected = holdings.find((h) => h.ticker.toUpperCase() === value.toUpperCase())
  const label = value ? value.toUpperCase() : "Select holding"

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Ticker</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            disabled={disabled}
            aria-expanded={open}
            aria-label="Select ticker to sell"
            className={cn(
              "h-9 w-full justify-between px-3 font-normal",
              !value && "text-muted-foreground",
            )}
          >
            <span className="truncate font-mono">{label}</span>
            <ChevronsUpDown className="ml-1 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[14rem] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search holding..." />
            <CommandList>
              <CommandEmpty>No open positions</CommandEmpty>
              <CommandGroup>
                {holdings.map((h) => (
                  <CommandItem
                    key={h.ticker}
                    value={h.ticker}
                    onSelect={() => {
                      onChange(h.ticker.toUpperCase(), h)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        value.toUpperCase() === h.ticker.toUpperCase() ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="font-mono">{h.ticker}</span>
                    <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                      {new Decimal(h.quantity).toFixed(4)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected && (
        <p className="text-xs text-muted-foreground">
          Available: {new Decimal(selected.quantity).toFixed(4)} shares
        </p>
      )}
    </div>
  )
}
