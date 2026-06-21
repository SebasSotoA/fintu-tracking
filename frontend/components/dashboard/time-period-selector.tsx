"use client"

import type React from "react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export type TimePeriod = "1M" | "3M" | "YTD" | "1Y" | "ALL"

export interface TimePeriodSelectorProps {
  value: TimePeriod
  onChange: (period: TimePeriod) => void
}

const items: { value: TimePeriod; label: string }[] = [
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
  { value: "YTD", label: "YTD" },
  { value: "1Y", label: "1Y" },
  { value: "ALL", label: "All" },
]

export function TimePeriodSelector({ value, onChange }: TimePeriodSelectorProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(val) => {
        if (val) onChange(val as TimePeriod)
      }}
      variant="outline"
      size="sm"
    >
      {items.map((item) => (
        <ToggleGroupItem
          key={item.value}
          value={item.value}
          aria-label={`Show ${item.label} period`}
          className="px-3 text-xs"
        >
          {item.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
