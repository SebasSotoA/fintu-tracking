"use client"

import { useEffect, useState } from "react"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
  const [draftDay, setDraftDay] = useState<Date | undefined>()

  useEffect(() => {
    if (!open) return
    setDraftDay(parseCalendarDay(value))
  }, [open, value])

  const triggerLabel = value ? formatCalendarDate(value) : "Pick a date"

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

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
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
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={draftDay}
            onSelect={setDraftDay}
            defaultMonth={draftDay ?? parseCalendarDay(value)}
          />
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
