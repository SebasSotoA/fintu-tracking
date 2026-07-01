"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BrokerSelect } from "@/components/brokers/broker-select"
import { useCompleteOnboarding } from "@/hooks/use-onboarding"
import {
  MARKET_CONFIG,
  SUPPORTED_COUNTRIES,
  countryLabel,
} from "@/lib/market-config/market-config"
import type { Profile } from "@/lib/api/me"

const onboardingSchema = z.object({
  country: z.string().min(1, "Select a country"),
  brokerPresetId: z.string().min(1, "Select a broker"),
})

type OnboardingForm = z.infer<typeof onboardingSchema>
type WizardStep = "welcome" | "country" | "broker"

interface OnboardingWizardProps {
  initialProfile: Profile
}

export function OnboardingWizard({ initialProfile }: OnboardingWizardProps) {
  const router = useRouter()
  const complete = useCompleteOnboarding()
  const [step, setStep] = useState<WizardStep>("welcome")

  const {
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      country: initialProfile.country || MARKET_CONFIG.defaultCountry,
      brokerPresetId: initialProfile.broker_preset_id || MARKET_CONFIG.defaultBrokerId,
    },
  })

  const country = useWatch({ control, name: "country" })
  const brokerPresetId = useWatch({ control, name: "brokerPresetId" })

  const onSubmit = async (values: OnboardingForm) => {
    try {
      const updatedProfile = await complete.mutateAsync({
        country: values.country,
        broker_preset_id: values.brokerPresetId,
      })
      toast.success("Welcome to Fintu!")
      const destination =
        updatedProfile.subscription_status === "active" ||
        updatedProfile.subscription_status === "trialing"
          ? "/dashboard"
          : "/subscription"
      router.push(destination)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to complete onboarding")
    }
  }

  const renderWelcome = () => (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Welcome to Fintu</CardTitle>
        <CardDescription>
          Let&apos;s set up your portfolio tracker in two quick steps.
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex justify-end">
        <Button onClick={() => setStep("country")}>Get started</Button>
      </CardFooter>
    </Card>
  )

  const renderCountry = () => (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Select your country</CardTitle>
        <CardDescription>
          This determines your local currency and available brokers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Select
          value={country}
          onValueChange={(value) => {
            setValue("country", value)
            setValue("brokerPresetId", "")
          }}
        >
          <SelectTrigger id="country">
            <SelectValue placeholder="Choose a country" />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_COUNTRIES.map((c) => (
              <SelectItem key={c} value={c}>
                {countryLabel(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" onClick={() => setStep("welcome")}>Back</Button>
        <Button
          disabled={!country}
          onClick={() => setStep("broker")}
        >
          Continue
        </Button>
      </CardFooter>
    </Card>
  )

  const renderBroker = () => (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Select your broker</CardTitle>
          <CardDescription>
            Pick the broker you use to deposit and trade {MARKET_CONFIG.baseCurrency} assets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brokerPresetId">Broker</Label>
            <BrokerSelect
              id="brokerPresetId"
              value={brokerPresetId}
              onChange={(value) => setValue("brokerPresetId", value)}
              country={country}
            />
            {errors.brokerPresetId && (
              <p className="text-destructive text-sm">{errors.brokerPresetId.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" type="button" onClick={() => setStep("country")} disabled={complete.isPending}>
            Back
          </Button>
          <Button type="submit" disabled={complete.isPending}>
            {complete.isPending ? "Saving..." : "Finish setup"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      {step === "welcome" && renderWelcome()}
      {step === "country" && renderCountry()}
      {step === "broker" && renderBroker()}
    </div>
  )
}
