"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useLocale } from "@/components/locale-provider"
import type { FeeUnit } from "@/lib/cash-flows/deposit-calculator"
import { cn } from "@/lib/utils"

export interface FeeAmountInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  feeUnit: FeeUnit
  onFeeUnitChange: (unit: FeeUnit) => void
  placeholder?: string
  min?: string
  step?: string
  equivalentHint?: string
}

export function FeeAmountInput({
  id,
  label,
  value,
  onChange,
  feeUnit,
  onFeeUnitChange,
  placeholder,
  min = "0",
  step = "0.01",
  equivalentHint,
}: FeeAmountInputProps) {
  const { t } = useLocale()
  const resolvedPlaceholder = placeholder ?? (feeUnit === "percent" ? "0.9" : "1.99")
  const hintId = `${id}-equivalent`

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}{" "}
        <span className="text-xs font-normal text-muted-foreground">{t("cash.optional")}</span>
      </Label>
      <div className="flex h-11 items-center rounded-md border border-input bg-transparent pr-1 shadow-xs focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] md:h-9">
        <Input
          id={id}
          type="number"
          step={step}
          min={min}
          placeholder={resolvedPlaceholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={equivalentHint ? hintId : undefined}
          className={cn(
            "h-full md:h-full w-auto min-w-0 flex-1 border-0 pl-3 pr-2 text-base md:text-sm py-0 leading-none font-mono shadow-none focus-visible:ring-0",
            "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          )}
        />
        <ToggleGroup
          type="single"
          role="radiogroup"
          aria-label={t("cash.feeUnit")}
          value={feeUnit}
          onValueChange={(next) => {
            if (next === "usd" || next === "percent") onFeeUnitChange(next)
          }}
          variant="outline"
          size="sm"
          className="shrink-0 shadow-none"
        >
          <ToggleGroupItem type="button" value="usd" aria-label={t("cash.feeInUsd")}>
            $
          </ToggleGroupItem>
          <ToggleGroupItem type="button" value="percent" aria-label={t("cash.feeAsPercent")}>
            %
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {equivalentHint ? (
        <p id={hintId} className="text-xs text-muted-foreground" role="status">
          {equivalentHint}
        </p>
      ) : null}
    </div>
  )
}
