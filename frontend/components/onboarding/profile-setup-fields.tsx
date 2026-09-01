"use client"

import type { FieldErrors, UseFormSetValue } from "react-hook-form"
import { z } from "zod"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BrokerSelect } from "@/components/brokers/broker-select"
import { useLocale } from "@/components/locale-provider"
import type { MessageKey } from "@/lib/i18n/types"
import {
  SUPPORTED_COUNTRIES,
  countryLabel,
} from "@/lib/market-config/market-config"

export function createProfileSetupSchema(t: (key: MessageKey) => string) {
  return z.object({
    country: z.string().min(1, t("validation.selectCountry")),
    brokerPresetId: z.string().min(1, t("validation.selectBroker")),
  })
}

export const profileSetupSchema = z.object({
  country: z.string().min(1, "Select a country"),
  brokerPresetId: z.string().min(1, "Select a broker"),
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
  const { t } = useLocale()

  return (
    <div className="space-y-4">
      {showCountry && (
        <div className="space-y-2">
          <Label htmlFor="country">{t("onboarding.country")}</Label>
          <Select
            value={country}
            onValueChange={(value) => {
              setValue("country", value)
              setValue("brokerPresetId", "")
            }}
          >
            <SelectTrigger id="country">
              <SelectValue placeholder={t("onboarding.countryPlaceholder")} />
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
            <p className="text-destructive text-sm">
              {localizeValidationMessage(errors.country.message, t)}
            </p>
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
            label={t("onboarding.broker")}
          />
          {errors.brokerPresetId && (
            <p className="text-destructive text-sm">
              {localizeValidationMessage(errors.brokerPresetId.message, t)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function localizeValidationMessage(
  message: string | undefined,
  t: (key: MessageKey) => string,
): string {
  if (message === "Select a country") return t("validation.selectCountry")
  if (message === "Select a broker") return t("validation.selectBroker")
  return message ?? ""
}
