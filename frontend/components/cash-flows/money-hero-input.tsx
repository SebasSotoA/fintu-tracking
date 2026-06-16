"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
}: MoneyHeroInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center rounded-md border border-input bg-transparent shadow-xs focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]">
        <span className="pl-3 text-3xl font-bold font-mono text-muted-foreground">$</span>
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
            "h-16 border-0 text-3xl font-bold font-mono shadow-none focus-visible:ring-0",
            "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          )}
        />
      </div>
    </div>
  )
}
