"use client"

import { DateRangePicker } from "@/components/filters/date-range-picker"
import { formatTradeDateRangeLabel, type TradeDateRange } from "@/lib/trades/trade-filters"

interface TradeDateFilterProps {
  value: TradeDateRange
  onChange: (value: TradeDateRange) => void
}

export function TradeDateFilter({ value, onChange }: TradeDateFilterProps) {
  return (
    <DateRangePicker
      id="trade-filter-date"
      label="Date"
      ariaLabel="Filter trades by date"
      value={value}
      onChange={onChange}
      formatLabel={formatTradeDateRangeLabel}
    />
  )
}
