"use client"

import { useEffect, useState } from "react"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  canNavigateToNextMonth,
  canNavigateToPreviousMonth,
  DatePickerDayHeaderWithNav,
  getDatePickerYearRange,
  MonthGridPicker,
  YearGridPicker,
} from "@/components/filters/date-picker-views"
import { formatCalendarDate } from "@/lib/date-utils"
import { parseCalendarDay, toCalendarDay } from "@/lib/date/calendar-day"
import { cn } from "@/lib/utils"

export interface SingleDatePickerProps {
  id: string
  label: string
  ariaLabel: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  disabled?: boolean
}

type DatePickerView = "day" | "year" | "month"

export function SingleDatePicker({
  id,
  label,
  ariaLabel,
  value,
  onChange,
  required,
  disabled,
}: SingleDatePickerProps) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<DatePickerView>("day")
  const [draftDay, setDraftDay] = useState<Date | undefined>()
  const today = new Date()
  const { minYear, maxYear } = getDatePickerYearRange(today)
  const startMonth = new Date(minYear, 0, 1)
  const endMonth = new Date(maxYear, 11, 1)
  const [displayMonth, setDisplayMonth] = useState<Date>(today)

  useEffect(() => {
    if (!open) {
      setView("day")
      return
    }

    const parsed = parseCalendarDay(value)
    setView("day")
    setDraftDay(parsed)
    setDisplayMonth(parsed ?? today)
  }, [open, value])

  const triggerLabel = value ? formatCalendarDate(value) : "Pick a date"

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setView("day")
    }
  }

  const handleApply = () => {
    if (draftDay) {
      onChange(toCalendarDay(draftDay))
    }
    setOpen(false)
  }

  const handleClear = () => {
    setDraftDay(undefined)
    onChange("")
    setOpen(false)
  }

  const handleYearSelect = (year: number) => {
    setDisplayMonth((current) => new Date(year, current.getMonth(), 1))
    setView("month")
  }

  const handleMonthSelect = (month: number) => {
    setDisplayMonth((current) => new Date(current.getFullYear(), month, 1))
    setView("day")
  }

  const handlePreviousMonth = () => {
    setDisplayMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setDisplayMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
  }

  const canGoPrevious = canNavigateToPreviousMonth(displayMonth, startMonth)
  const canGoNext = canNavigateToNextMonth(displayMonth, endMonth)

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </Label>
      <Popover open={open} onOpenChange={handleOpenChange} modal>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={ariaLabel}
            aria-required={required}
            className={cn(
              "h-9 w-full justify-start gap-2 px-3 font-normal",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="size-4 shrink-0 opacity-70" />
            <span className="truncate">{triggerLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="z-[100] w-auto p-0 [--cell-size:--spacing(8)]"
          align="start"
        >
          {view === "day" ? (
            <>
              <DatePickerDayHeaderWithNav
                displayDate={displayMonth}
                onYearClick={() => setView("year")}
                onMonthClick={() => setView("month")}
                onPreviousMonth={handlePreviousMonth}
                onNextMonth={handleNextMonth}
                canGoPrevious={canGoPrevious}
                canGoNext={canGoNext}
              />
              <Calendar
                mode="single"
                selected={draftDay}
                onSelect={setDraftDay}
                month={displayMonth}
                onMonthChange={setDisplayMonth}
                startMonth={startMonth}
                endMonth={endMonth}
                hideNavigation
                className="pt-0"
                components={{
                  MonthCaption: () => <div className="hidden" aria-hidden />,
                }}
                classNames={{
                  month_caption: "hidden",
                }}
              />
            </>
          ) : null}
          {view === "year" ? (
            <YearGridPicker
              minYear={minYear}
              maxYear={maxYear}
              focusYear={displayMonth.getFullYear()}
              selectedYear={displayMonth.getFullYear()}
              onSelectYear={handleYearSelect}
            />
          ) : null}
          {view === "month" ? (
            <MonthGridPicker
              year={displayMonth.getFullYear()}
              selectedMonth={displayMonth.getMonth()}
              onSelectMonth={handleMonthSelect}
            />
          ) : null}
          <div className="flex items-center justify-end gap-2 border-t border-border p-3">
            <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
              Clear
            </Button>
            <Button type="button" size="sm" onClick={handleApply} disabled={!draftDay}>
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
