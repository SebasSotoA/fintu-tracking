"use client"

import { useEffect, useState } from "react"
import type { DateRange } from "react-day-picker"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { parseCalendarDay, toCalendarDay } from "@/lib/date/calendar-day"
import { cn } from "@/lib/utils"
import {
  applyTradeDatePreset,
  EMPTY_TRADE_DATE_RANGE,
  normalizeTradeDateRange,
  type TradeDatePreset,
  type TradeDateRange,
} from "@/lib/trades/trade-filters"

const PRESETS: { id: TradeDatePreset; label: string }[] = [
  { id: "last30d", label: "Last 30d" },
  { id: "ytd", label: "YTD" },
  { id: "12m", label: "12M" },
]

export interface DateRangePickerProps {
  id: string
  label: string
  ariaLabel: string
  value: TradeDateRange
  onChange: (value: TradeDateRange) => void
  formatLabel: (range: TradeDateRange) => string
}

export function DateRangePicker({
  id,
  label,
  ariaLabel,
  value,
  onChange,
  formatLabel,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"day" | "range">("day")
  const [draft, setDraft] = useState<TradeDateRange>(value)
  const [singleDay, setSingleDay] = useState<Date | undefined>()
  const [rangeSelection, setRangeSelection] = useState<DateRange | undefined>()

  useEffect(() => {
    if (!open) return
    setDraft(value)
    const hasRange = value.from !== null && value.to !== null && value.to !== value.from
    setMode(hasRange ? "range" : "day")
    setSingleDay(parseCalendarDay(value.from))
    setRangeSelection({
      from: parseCalendarDay(value.from),
      to: parseCalendarDay(value.to),
    })
  }, [open, value])

  const triggerLabel = formatLabel(value)
  const isEmpty = value.from === null

  const handleApply = () => {
    onChange(normalizeTradeDateRange(draft))
    setOpen(false)
  }

  const handleClear = () => {
    setDraft(EMPTY_TRADE_DATE_RANGE)
    setSingleDay(undefined)
    setRangeSelection(undefined)
    onChange(EMPTY_TRADE_DATE_RANGE)
    setOpen(false)
  }

  const handlePreset = (preset: TradeDatePreset) => {
    const next = applyTradeDatePreset(preset)
    setMode("range")
    setDraft(next)
    setRangeSelection({
      from: parseCalendarDay(next.from),
      to: parseCalendarDay(next.to),
    })
    setSingleDay(undefined)
  }

  const handleModeChange = (next: string) => {
    const nextMode = next as "day" | "range"
    setMode(nextMode)
    if (nextMode === "day") {
      setDraft({ from: draft.from, to: null })
      setSingleDay(parseCalendarDay(draft.from))
      setRangeSelection(undefined)
    } else if (draft.from) {
      setRangeSelection({
        from: parseCalendarDay(draft.from),
        to: parseCalendarDay(draft.to ?? draft.from),
      })
      if (draft.from && !draft.to) {
        setDraft({ from: draft.from, to: draft.from })
      }
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-label={ariaLabel}
            className={cn(
              "h-8 min-w-[11rem] justify-start gap-2 px-2.5 font-normal",
              isEmpty && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="size-3.5 shrink-0 opacity-70" />
            <span className="truncate">{triggerLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="border-b border-border p-3">
            <Tabs value={mode} onValueChange={handleModeChange}>
              <TabsList className="grid h-8 w-full grid-cols-2">
                <TabsTrigger value="day" className="text-xs">
                  Day
                </TabsTrigger>
                <TabsTrigger value="range" className="text-xs">
                  Range
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {mode === "day" ? (
            <Calendar
              mode="single"
              selected={singleDay}
              onSelect={(date) => {
                setSingleDay(date)
                if (date) {
                  setDraft({ from: toCalendarDay(date), to: null })
                } else {
                  setDraft(EMPTY_TRADE_DATE_RANGE)
                }
              }}
              defaultMonth={singleDay}
            />
          ) : (
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={rangeSelection}
              onSelect={(range) => {
                setRangeSelection(range)
                if (!range?.from) {
                  setDraft(EMPTY_TRADE_DATE_RANGE)
                  return
                }
                setDraft({
                  from: toCalendarDay(range.from),
                  to: range.to ? toCalendarDay(range.to) : null,
                })
              }}
              defaultMonth={rangeSelection?.from ?? singleDay}
            />
          )}

          <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => handlePreset(preset.id)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border p-3">
            <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              disabled={mode === "day" ? !draft.from : !draft.from || !draft.to}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
