"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const YEARS_PER_PAGE = 12

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

export function getDatePickerYearRange(referenceDate = new Date()) {
  const year = referenceDate.getFullYear()
  return { minYear: year - 15, maxYear: year + 1 }
}

export function getYearPageStart(year: number, minYear: number, pageSize = YEARS_PER_PAGE) {
  const offset = Math.max(0, year - minYear)
  const pageIndex = Math.floor(offset / pageSize)
  return minYear + pageIndex * pageSize
}

export interface DatePickerDayHeaderProps {
  displayDate: Date
  onYearClick: () => void
  onMonthClick: () => void
}

export function DatePickerDayHeader({
  displayDate,
  onYearClick,
  onMonthClick,
}: DatePickerDayHeaderProps) {
  const monthName = displayDate.toLocaleString("default", { month: "long" })
  const year = displayDate.getFullYear()

  return (
    <div className="flex items-center justify-center gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2 font-medium"
        aria-label={`Select month ${monthName}`}
        onClick={onMonthClick}
      >
        {monthName}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2 font-medium"
        aria-label={`Select year ${year}`}
        onClick={onYearClick}
      >
        {year}
      </Button>
    </div>
  )
}

export interface DatePickerDayHeaderWithNavProps extends DatePickerDayHeaderProps {
  onPreviousMonth: () => void
  onNextMonth: () => void
  canGoPrevious: boolean
  canGoNext: boolean
}

export function DatePickerDayHeaderWithNav({
  displayDate,
  onYearClick,
  onMonthClick,
  onPreviousMonth,
  onNextMonth,
  canGoPrevious,
  canGoNext,
}: DatePickerDayHeaderWithNavProps) {
  return (
    <div className="flex items-center justify-between px-3 pt-3">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label="Previous month"
        disabled={!canGoPrevious}
        onClick={onPreviousMonth}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <DatePickerDayHeader
        displayDate={displayDate}
        onYearClick={onYearClick}
        onMonthClick={onMonthClick}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label="Next month"
        disabled={!canGoNext}
        onClick={onNextMonth}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}

export function canNavigateToPreviousMonth(displayMonth: Date, startMonth: Date) {
  const year = displayMonth.getFullYear()
  const month = displayMonth.getMonth()
  const startYear = startMonth.getFullYear()
  const startMonthIndex = startMonth.getMonth()
  return year > startYear || (year === startYear && month > startMonthIndex)
}

export function canNavigateToNextMonth(displayMonth: Date, endMonth: Date) {
  const year = displayMonth.getFullYear()
  const month = displayMonth.getMonth()
  const endYear = endMonth.getFullYear()
  const endMonthIndex = endMonth.getMonth()
  return year < endYear || (year === endYear && month < endMonthIndex)
}

export interface YearGridPickerProps {
  minYear: number
  maxYear: number
  focusYear: number
  selectedYear?: number
  onSelectYear: (year: number) => void
}

export function YearGridPicker({
  minYear,
  maxYear,
  focusYear,
  selectedYear,
  onSelectYear,
}: YearGridPickerProps) {
  const [pageStart, setPageStart] = useState(() =>
    getYearPageStart(focusYear, minYear, YEARS_PER_PAGE),
  )

  useEffect(() => {
    setPageStart(getYearPageStart(focusYear, minYear, YEARS_PER_PAGE))
  }, [focusYear, minYear])

  const years = useMemo(() => {
    const result: number[] = []
    for (let index = 0; index < YEARS_PER_PAGE; index += 1) {
      const year = pageStart + index
      if (year > maxYear) break
      result.push(year)
    }
    return result
  }, [pageStart, maxYear])

  const pageEnd = years[years.length - 1] ?? pageStart
  const canGoPrev = pageStart > minYear
  const canGoNext = pageStart + YEARS_PER_PAGE <= maxYear

  return (
    <div className="w-[calc(var(--cell-size)*7)] space-y-2 p-1">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Previous years"
          disabled={!canGoPrev}
          onClick={() => setPageStart((current) => Math.max(minYear, current - YEARS_PER_PAGE))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium tabular-nums">
          {pageStart} – {pageEnd}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Next years"
          disabled={!canGoNext}
          onClick={() => setPageStart((current) => current + YEARS_PER_PAGE)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {years.map((year) => (
          <Button
            key={year}
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Select year ${year}`}
            className={cn(
              "h-8 font-normal tabular-nums",
              selectedYear === year && "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
            onClick={() => onSelectYear(year)}
          >
            {year}
          </Button>
        ))}
      </div>
    </div>
  )
}

export interface MonthGridPickerProps {
  year: number
  selectedMonth?: number
  onSelectMonth: (month: number) => void
}

export function MonthGridPicker({ year, selectedMonth, onSelectMonth }: MonthGridPickerProps) {
  return (
    <div className="w-[calc(var(--cell-size)*7)] space-y-2 p-1">
      <p className="text-center text-sm font-medium tabular-nums">{year}</p>
      <div className="grid grid-cols-3 gap-1">
        {MONTH_NAMES.map((monthName, monthIndex) => (
          <Button
            key={monthName}
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Select ${monthName} ${year}`}
            className={cn(
              "h-8 font-normal",
              selectedMonth === monthIndex && "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
            onClick={() => onSelectMonth(monthIndex)}
          >
            {monthName.slice(0, 3)}
          </Button>
        ))}
      </div>
    </div>
  )
}
