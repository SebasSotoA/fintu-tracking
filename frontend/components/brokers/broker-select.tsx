"use client"

import { useQuery } from "@tanstack/react-query"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"
import { listBrokerPresetsForCountry } from "@/lib/brokers/broker-presets"
import { listBrokers } from "@/lib/api/brokers"
import { cn } from "@/lib/utils"

interface BrokerSelectProps {
  id: string
  value: string
  onChange: (value: string) => void
  label?: string
  hideLabel?: boolean
  country?: string
}

export function BrokerSelect({
  id,
  value,
  onChange,
  label = "Broker",
  hideLabel = false,
  country,
}: BrokerSelectProps) {
  const effectiveCountry = country ?? MARKET_CONFIG.defaultCountry
  const showLabel = !hideLabel && label !== ""

  const { data } = useQuery({
    queryKey: ["brokers"],
    queryFn: listBrokers,
    staleTime: 60_000,
  })

  // If value is a broker UUID, map it to the corresponding preset_id so Radix
  // can match it against the SelectItem values (which are preset ids).
  const brokers = data?.brokers ?? []
  const resolvedValue = brokers.find((b) => b.id === value)?.preset_id ?? value

  const select = (
    <Select value={resolvedValue} onValueChange={onChange}>
      <SelectTrigger
        id={id}
        size={showLabel ? "default" : "sm"}
        className={cn(showLabel ? "w-full" : "w-full min-w-32 justify-between sm:w-auto")}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {listBrokerPresetsForCountry(effectiveCountry).map((preset) => (
          <SelectItem key={preset.id} value={preset.id}>
            {preset.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  if (!showLabel) {
    return select
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {select}
    </div>
  )
}
