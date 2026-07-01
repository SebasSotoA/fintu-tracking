"use client"

import type { FieldErrors, UseFormSetValue } from "react-hook-form"
import { z } from "zod"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BrokerSelect } from "@/components/brokers/broker-select"
import {
  SUPPORTED_COUNTRIES,
  countryLabel,
} from "@/lib/market-config/market-config"

export const profileSetupSchema = z.object({
  country: z.string().min(1, "Selecciona un país"),
  brokerPresetId: z.string().min(1, "Selecciona un broker"),
})

export type ProfileSetupForm = z.infer<typeof profileSetupSchema>

interface ProfileSetupFieldsProps {
  step: "country" | "broker" | "all"
  setValue: UseFormSetValue<ProfileSetupForm>
  errors: FieldErrors<ProfileSetupForm>
  country: string
  brokerPresetId: string
}

export function ProfileSetupFields({
  step,
  setValue,
  errors,
  country,
  brokerPresetId,
}: ProfileSetupFieldsProps) {
  const showCountry = step === "country" || step === "all"
  const showBroker = step === "broker" || step === "all"

  return (
    <div className="space-y-4">
      {showCountry && (
        <div className="space-y-2">
          <Label htmlFor="country">País</Label>
          <Select
            value={country}
            onValueChange={(value) => {
              setValue("country", value)
              setValue("brokerPresetId", "")
            }}
          >
            <SelectTrigger id="country">
              <SelectValue placeholder="Elige tu país" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {countryLabel(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.country && (
            <p className="text-destructive text-sm">{errors.country.message}</p>
          )}
        </div>
      )}

      {showBroker && (
        <div className="space-y-2">
          <BrokerSelect
            id="brokerPresetId"
            value={brokerPresetId}
            onChange={(value) => setValue("brokerPresetId", value)}
            country={country}
            label="Broker"
          />
          {errors.brokerPresetId && (
            <p className="text-destructive text-sm">{errors.brokerPresetId.message}</p>
          )}
        </div>
      )}
    </div>
  )
}
