"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { filterTriggerClassName } from "@/components/filters/filter-trigger"
import { cn } from "@/lib/utils"

export function FilterSelect<T extends string>({
  id,
  label,
  ariaLabel,
  value,
  options,
  onChange,
  triggerClassName,
}: {
  id: string
  label: string
  ariaLabel?: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  triggerClassName?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={(next) => onChange(next as T)}>
        <SelectTrigger
          id={id}
          className={cn(
            filterTriggerClassName,
            "data-[size=default]:h-9",
            triggerClassName ?? "w-full sm:w-[7.5rem]",
          )}
          aria-label={ariaLabel ?? label}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
