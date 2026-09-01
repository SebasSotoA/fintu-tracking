"use client"

import { useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronsUpDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { searchMarketSymbols } from "@/lib/api/portfolio"
import type { SymbolSearchResult } from "@/lib/api/portfolio"
import { cn } from "@/lib/utils"
import { useLocale } from "@/components/locale-provider"

interface TickerSearchProps {
  id: string
  value: string
  onChange: (ticker: string, assetType?: SymbolSearchResult["asset_type"]) => void
  disabled?: boolean
}

export function TickerSearch({ id, value, onChange, disabled }: TickerSearchProps) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const [inputQuery, setInputQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Set to true when a result is picked so handleOpenChange knows not to fire a
  // freeform onChange call when the Popover closes (Radix can call onOpenChange(false)
  // before React commits the batch from onSelect, leaving inputQuery stale).
  const pickedRef = useRef(false)

  const { data: results = [] } = useQuery({
    queryKey: ["market-symbol-search", debouncedQuery],
    queryFn: () => searchMarketSymbols(debouncedQuery),
    enabled: debouncedQuery.length >= 1,
    staleTime: 60_000,
  })

  const handleValueChange = (v: string) => {
    setInputQuery(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebouncedQuery(v), 300)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      if (!pickedRef.current && inputQuery.trim()) {
        onChange(inputQuery.trim().toUpperCase())
      }
      pickedRef.current = false
    }
    if (next) {
      setInputQuery("")
      setDebouncedQuery("")
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    setOpen(next)
  }

  const label = value ? value.toUpperCase() : t("trades.searchTicker")

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{t("trades.ticker")}</Label>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            disabled={disabled}
            aria-expanded={open}
            aria-label={t("trades.searchTicker")}
            className={cn(
              "h-9 w-full justify-between px-3 font-normal",
              !value && "text-muted-foreground",
            )}
          >
            <span className={cn("truncate", value && "font-mono")}>{label}</span>
            <ChevronsUpDown className="ml-1 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[18rem] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={t("trades.searchTickerPlaceholder")}
              value={inputQuery}
              onValueChange={handleValueChange}
            />
            <CommandList>
              <CommandEmpty>
                {debouncedQuery.length >= 1 ? t("trades.noTickerFoundShort") : t("trades.typeToSearch")}
              </CommandEmpty>
              <CommandGroup>
                {results.map((r) => (
                  <CommandItem
                    key={`${r.symbol}-${r.asset_type}`}
                    value={r.symbol}
                    onSelect={() => {
                      pickedRef.current = true
                      onChange(r.symbol.toUpperCase(), r.asset_type)
                      setInputQuery("")
                      setDebouncedQuery("")
                      setOpen(false)
                    }}
                  >
                    <span className="font-mono">{r.symbol}</span>
                    <span className="ml-2 truncate text-xs text-muted-foreground">{r.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              {inputQuery.trim() && (
                <>
                  <CommandSeparator alwaysRender />
                  <CommandGroup heading={t("trades.customTicker")}>
                    <CommandItem
                      data-testid="use-custom-ticker"
                      value={`__use__${inputQuery.trim().toUpperCase()}`}
                      className="text-muted-foreground"
                      onSelect={() => {
                        pickedRef.current = true
                        onChange(inputQuery.trim().toUpperCase())
                        setInputQuery("")
                        setDebouncedQuery("")
                        setOpen(false)
                      }}
                    >
                      <Plus className="size-4 text-muted-foreground" aria-hidden={true} />
                      <span>
                        {t("trades.useTicker", { ticker: inputQuery.trim().toUpperCase() })}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">{t("trades.notInList")}</span>
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
