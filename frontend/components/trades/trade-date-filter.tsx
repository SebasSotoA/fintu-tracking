"use client"

import { DateRangePicker } from "@/components/filters/date-range-picker"
import { useLocale } from "@/components/locale-provider"
import { intlLocale } from "@/lib/date-utils"
import { formatTradeDateRangeLabel, type TradeDateRange } from "@/lib/trades/trade-filters"

interface TradeDateFilterProps {
  value: TradeDateRange
  onChange: (value: TradeDateRange) => void
}

export function TradeDateFilter({ value, onChange }: TradeDateFilterProps) {
  const { locale } = useLocale()
  const dateLocale = intlLocale(locale)

  return (
    <DateRangePicker
      id="trade-filter-date"
      label="Date"
      ariaLabel="Filter trades by date"
      value={value}
      onChange={onChange}
      formatLabel={(range) => formatTradeDateRangeLabel(range, dateLocale)}
    />
  )
}
