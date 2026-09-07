"use client"

import { CircleHelp } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export interface MoneyHeroInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
  min?: string
  step?: string
  help?: string
  helpLabel?: string
}

export function MoneyHeroInput({
  id,
  label,
  value,
  onChange,
  required,
  placeholder = "100.00",
  min = "0",
  step = "0.01",
  help,
  helpLabel,
}: MoneyHeroInputProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <Label htmlFor={id}>{label}</Label>
        {help ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={helpLabel ?? "Help"}
                className="inline-flex rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CircleHelp aria-hidden="true" className="size-3.5 shrink-0" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-pretty">
              {help}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      <div className="flex h-11 items-center rounded-md border border-input bg-transparent shadow-xs focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] md:h-9">
        <span className="flex h-full shrink-0 items-center pl-4 pr-1 leading-none text-base font-mono text-muted-foreground md:text-sm">$</span>
        <Input
          id={id}
          type="number"
          step={step}
          min={min}
          placeholder={placeholder}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "h-full md:h-full w-auto min-w-0 flex-1 border-0 pl-1.5 pr-3 text-base md:text-sm py-0 leading-none font-mono shadow-none focus-visible:ring-0",
            "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          )}
        />
      </div>
    </div>
  )
}
