"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"
import { listBrokerPresetsForCountry } from "@/lib/brokers/broker-presets"

interface BrokerSelectProps {
  id: string
  value: string
  onChange: (value: string) => void
  label?: string
  country?: string
}

export function BrokerSelect({ id, value, onChange, label = "Broker", country }: BrokerSelectProps) {
  const effectiveCountry = country ?? MARKET_CONFIG.defaultCountry
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}>
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
