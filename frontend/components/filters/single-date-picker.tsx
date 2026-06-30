"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
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
import { useIsMobile } from "@/hooks/use-mobile"

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

function SingleDatePickerViews({
  draftDay,
  setDraftDay,
  displayMonth,
  setDisplayMonth,
  today,
  startMonth,
  endMonth,
}: {
  draftDay: Date | undefined
  setDraftDay: (date: Date | undefined) => void
  displayMonth: Date
  setDisplayMonth: React.Dispatch<React.SetStateAction<Date>>
  today: Date
  startMonth: Date
  endMonth: Date
}) {
  const [view, setView] = useState<DatePickerView>("day")
  const { minYear, maxYear } = getDatePickerYearRange(today)

  const handleYearSelect = (year: number) => {
    setDisplayMonth(new Date(year, displayMonth.getMonth(), 1))
    setView("month")
  }

  const handleMonthSelect = (month: number) => {
    setDisplayMonth(new Date(displayMonth.getFullYear(), month, 1))
    setView("day")
  }

  const handlePreviousMonth = () => {
    setDisplayMonth((current: Date) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setDisplayMonth((current: Date) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
  }

  const canGoPrevious = canNavigateToPreviousMonth(displayMonth, startMonth)
  const canGoNext = canNavigateToNextMonth(displayMonth, endMonth)

  return (
    <>
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
    </>
  )
}

export function SingleDatePicker({
  id,
  label,
  ariaLabel,
  value,
  onChange,
  required,
  disabled,
}: SingleDatePickerProps) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const [draftDay, setDraftDay] = useState<Date | undefined>()
  const todayRef = React.useRef(new Date())
  const today = todayRef.current
  const { minYear, maxYear } = getDatePickerYearRange(today)
  const startMonth = new Date(minYear, 0, 1)
  const endMonth = new Date(maxYear, 11, 1)
  const [displayMonth, setDisplayMonth] = useState<Date>(today)

  useEffect(() => {
    if (!open) {
      return
    }

    const parsed = parseCalendarDay(value)
    setDraftDay(parsed)
    setDisplayMonth(parsed ?? today)
  }, [open, value, today])

  const triggerLabel = value ? formatCalendarDate(value) : "Pick a date"

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
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

  const TriggerButton = (
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
  )

  const Footer = (
    <div className="flex items-center justify-end gap-2 border-t border-border p-3">
      <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
        Clear
      </Button>
      <Button type="button" size="sm" onClick={handleApply} disabled={!draftDay}>
        Apply
      </Button>
    </div>
  )

  if (isMobile === undefined) {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>
          {label}
          {required ? " *" : ""}
        </Label>
        {TriggerButton}
      </div>
    )
  }

  if (isMobile) {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>
          {label}
          {required ? " *" : ""}
        </Label>
        <Drawer open={open} onOpenChange={handleOpenChange}>
          <DrawerTrigger asChild>{TriggerButton}</DrawerTrigger>
          <DrawerContent className="px-4 pb-safe" aria-describedby={`${id}-description`}>
            <DrawerHeader className="pb-2 text-left">
              <DrawerTitle>{label}</DrawerTitle>
              <p id={`${id}-description`} className="text-sm text-muted-foreground">
                Select a date
              </p>
            </DrawerHeader>
            <div className="px-4 py-2">
              <SingleDatePickerViews
                draftDay={draftDay}
                setDraftDay={setDraftDay}
                displayMonth={displayMonth}
                setDisplayMonth={setDisplayMonth}
                today={today}
                startMonth={startMonth}
                endMonth={endMonth}
              />
            </div>
            <DrawerFooter className="px-4 pb-6">
              <DrawerClose asChild>
                <Button type="button" variant="outline" size="sm" className="w-full">
                  Cancel
                </Button>
              </DrawerClose>
              {Footer}
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </Label>
      <Popover open={open} onOpenChange={handleOpenChange} modal>
        <PopoverTrigger asChild>{TriggerButton}</PopoverTrigger>
        <PopoverContent
          className="z-[100] w-auto p-0 [--cell-size:--spacing(8)]"
          align="start"
        >
          <SingleDatePickerViews
            draftDay={draftDay}
            setDraftDay={setDraftDay}
            displayMonth={displayMonth}
            setDisplayMonth={setDisplayMonth}
            today={today}
            startMonth={startMonth}
            endMonth={endMonth}
          />
          {Footer}
        </PopoverContent>
      </Popover>
    </div>
  )
}
