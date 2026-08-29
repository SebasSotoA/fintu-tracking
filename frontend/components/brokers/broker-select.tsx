"use client"

import { useQuery } from "@tanstack/react-query"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"
import { listBrokerPresetsForCountry } from "@/lib/brokers/broker-presets"
import { listBrokers } from "@/lib/api/brokers"

interface BrokerSelectProps {
  id: string
  value: string
  onChange: (value: string) => void
  label?: string
  country?: string
}

export function BrokerSelect({ id, value, onChange, label = "Broker", country }: BrokerSelectProps) {
  const effectiveCountry = country ?? MARKET_CONFIG.defaultCountry

  const { data } = useQuery({
    queryKey: ["brokers"],
    queryFn: listBrokers,
    staleTime: 60_000,
  })

  // If value is a broker UUID, map it to the corresponding preset_id so Radix
  // can match it against the SelectItem values (which are preset ids).
  const brokers = data?.brokers ?? []
  const resolvedValue = brokers.find((b) => b.id === value)?.preset_id ?? value

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={resolvedValue} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
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
    </div>
  )
}
