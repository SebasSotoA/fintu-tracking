"use client"

import { useEffect, useState } from "react"
import type { DateRange } from "react-day-picker"
import { CalendarIcon, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { filterTriggerClassName } from "@/components/filters/filter-trigger"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { parseCalendarDay, toCalendarDay } from "@/lib/date/calendar-day"
import { useLocale } from "@/components/locale-provider"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  applyTradeDatePreset,
  EMPTY_TRADE_DATE_RANGE,
  normalizeTradeDateRange,
  type TradeDatePreset,
  type TradeDateRange,
} from "@/lib/trades/trade-filters"

export interface DateRangePickerProps {
  id: string
  label: string
  ariaLabel: string
  value: TradeDateRange
  onChange: (value: TradeDateRange) => void
  formatLabel: (range: TradeDateRange) => string
  hideLabel?: boolean
  popoverAlign?: "start" | "center" | "end"
}

function DateRangePickerContent({
  mode,
  setMode,
  singleDay,
  setSingleDay,
  rangeSelection,
  setRangeSelection,
  draft,
  setDraft,
  onPreset,
}: {
  mode: "day" | "range"
  setMode: (mode: "day" | "range") => void
  singleDay: Date | undefined
  setSingleDay: (date: Date | undefined) => void
  rangeSelection: DateRange | undefined
  setRangeSelection: (range: DateRange | undefined) => void
  draft: TradeDateRange
  setDraft: (draft: TradeDateRange) => void
  onPreset: (preset: TradeDatePreset) => void
}) {
  const { t } = useLocale()
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
    <>
      <div className="border-b border-border p-3">
        <Tabs value={mode} onValueChange={handleModeChange}>
          <TabsList className="grid h-8 w-full grid-cols-2">
            <TabsTrigger value="day" className="text-xs">
              {t("filters.day")}
            </TabsTrigger>
            <TabsTrigger value="range" className="text-xs">
              {t("filters.range")}
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
          className="mx-auto"
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
          className="mx-auto"
        />
      )}

      <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
        {(
          [
            { id: "last30d" as const, label: t("filters.last30d") },
            { id: "ytd" as const, label: t("filters.ytd") },
            { id: "12m" as const, label: t("filters.twelveM") },
          ] satisfies { id: TradeDatePreset; label: string }[]
        ).map((preset) => (
          <Button
            key={preset.id}
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onPreset(preset.id)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </>
  )
}

export function DateRangePicker({
  id,
  label,
  ariaLabel,
  value,
  onChange,
  formatLabel,
  hideLabel = false,
  popoverAlign = "start",
}: DateRangePickerProps) {
  const { t } = useLocale()
  const isMobile = useIsMobile()
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
    onChange(normalizeTradeDateRange(next))
    setOpen(false)
  }

  const TriggerButton = (
    <Button
      id={id}
      type="button"
      variant="outline"
      aria-label={ariaLabel}
      className={cn(
        filterTriggerClassName,
        "min-w-[11rem] w-full md:w-auto justify-between",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <CalendarIcon className="size-3.5 shrink-0 opacity-70" aria-hidden />
        <span className="truncate">{triggerLabel}</span>
      </span>
      <ChevronDown className="size-4 opacity-50" aria-hidden />
    </Button>
  )

  const Footer = (
    <div className="flex items-center justify-end gap-2 border-t border-border p-3">
      <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
        {t("filters.clear")}
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={handleApply}
        disabled={mode === "day" ? !draft.from : !draft.from || !draft.to}
      >
        {t("filters.apply")}
      </Button>
    </div>
  )

  const rootClassName = cn(!hideLabel && "space-y-1.5")
  const labelClassName = cn(
    "text-xs text-muted-foreground",
    hideLabel && "sr-only",
  )

  if (isMobile === undefined) {
    return (
      <div className={rootClassName}>
        <Label htmlFor={id} className={labelClassName}>
          {label}
        </Label>
        {TriggerButton}
      </div>
    )
  }

  if (isMobile) {
    return (
      <div className={rootClassName}>
        <Label htmlFor={id} className={cn(labelClassName, !hideLabel && "md:hidden")}>
          {label}
        </Label>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>{TriggerButton}</DrawerTrigger>
          <DrawerContent className="px-4 pb-safe" aria-describedby={`${id}-description`}>
            <DrawerHeader className="pb-2 text-left">
              <DrawerTitle>{label}</DrawerTitle>
              <p id={`${id}-description`} className="text-sm text-muted-foreground">
                {t("filters.selectDayOrRange")}
              </p>
            </DrawerHeader>
            <div className="px-4 py-2">
              <DateRangePickerContent
                mode={mode}
                setMode={setMode}
                singleDay={singleDay}
                setSingleDay={setSingleDay}
                rangeSelection={rangeSelection}
                setRangeSelection={setRangeSelection}
                draft={draft}
                setDraft={setDraft}
                onPreset={handlePreset}
              />
            </div>
            <DrawerFooter className="px-4 pb-6">
              {Footer}
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    )
  }

  return (
    <div className={rootClassName}>
      <Label htmlFor={id} className={labelClassName}>
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{TriggerButton}</PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align={popoverAlign}
          collisionPadding={8}
        >
          <DateRangePickerContent
            mode={mode}
            setMode={setMode}
            singleDay={singleDay}
            setSingleDay={setSingleDay}
            rangeSelection={rangeSelection}
            setRangeSelection={setRangeSelection}
            draft={draft}
            setDraft={setDraft}
            onPreset={handlePreset}
          />
          {Footer}
        </PopoverContent>
      </Popover>
    </div>
  )
}
