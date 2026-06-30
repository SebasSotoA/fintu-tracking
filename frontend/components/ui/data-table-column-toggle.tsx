"use client"

import { useMemo, useState } from "react"
import { Check, Columns3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { DataTableColumn } from "@/components/ui/data-table"

interface DataTableColumnToggleProps<T> {
  columns: DataTableColumn<T>[]
  visibleKeys: string[]
  defaultVisibleKeys: string[]
  onChange: (visibleKeys: string[]) => void
  className?: string
}

function getColumnLabel<T>(column: DataTableColumn<T>): string {
  if (column.label) return column.label
  if (typeof column.header === "string") return column.header
  return column.key
}

export function DataTableColumnToggle<T>({
  columns,
  visibleKeys,
  defaultVisibleKeys,
  onChange,
  className,
}: DataTableColumnToggleProps<T>) {
  const [open, setOpen] = useState(false)

  const options = useMemo(
    () => columns.filter((column): column is DataTableColumn<T> => column.toggleable !== false),
    [columns],
  )

  const toggleKey = (key: string) => {
    const next = new Set(visibleKeys)
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }
    onChange(Array.from(next))
  }

  const handleReset = () => {
    onChange(defaultVisibleKeys)
  }

  if (options.length === 0) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className={cn("gap-2", className)}>
          <Columns3 className="size-4" />
          <span>View</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="end">
        <Command>
          <CommandInput placeholder="Search columns..." />
          <CommandList className="max-h-60 overflow-y-auto scrollbar-minimal">
            <CommandEmpty>No columns found.</CommandEmpty>
            <CommandGroup>
              {options.map((column) => {
                const label = getColumnLabel(column)
                const isVisible = visibleKeys.includes(column.key)
                return (
                  <CommandItem
                    key={column.key}
                    value={column.key}
                    onSelect={() => toggleKey(column.key)}
                  >
                    <Check
                      className={cn("mr-2 size-4", isVisible ? "opacity-100" : "opacity-0")}
                    />
                    {label}
                  </CommandItem>
                )
              })}
            </CommandGroup>
            <CommandGroup>
              <CommandItem value="reset" onSelect={handleReset}>
                <span className="text-muted-foreground">Reset to default</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
