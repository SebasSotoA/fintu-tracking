"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { DialogScrollBody } from "@/components/ui/dialog-scroll-body"
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress"
import {
  ProfileSetupFields,
  profileSetupSchema,
  type ProfileSetupForm,
} from "@/components/onboarding/profile-setup-fields"
import { useCompleteOnboarding } from "@/hooks/use-onboarding"
import { useLocale } from "@/components/locale-provider"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"
import type { Profile } from "@/lib/api/me"

type SetupStep = 1 | 2

interface SetupModalProps {
  initialProfile: Profile
}

export function SetupModal({ initialProfile }: SetupModalProps) {
  const router = useRouter()
  const complete = useCompleteOnboarding()
  const { t } = useLocale()
  const [step, setStep] = useState<SetupStep>(1)
  const [open, setOpen] = useState(!initialProfile.onboarding_completed)

  const {
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ProfileSetupForm>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      country: initialProfile.country || MARKET_CONFIG.defaultCountry,
      brokerPresetId: initialProfile.broker_preset_id || "",
    },
  })

  const country = useWatch({ control, name: "country" })
  const brokerPresetId = useWatch({ control, name: "brokerPresetId" })

  const onSubmit = async (values: ProfileSetupForm) => {
    try {
      const updatedProfile = await complete.mutateAsync({
        country: values.country,
        broker_preset_id: values.brokerPresetId,
      })
      toast.success(t("onboarding.setupComplete"))
      setOpen(false)

      const needsSubscription =
        updatedProfile.subscription_status !== "active" &&
        updatedProfile.subscription_status !== "trialing"

      if (needsSubscription) {
        router.push("/subscription")
      } else {
        router.refresh()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("onboarding.setupError"))
    }
  }

  const handleContinue = () => {
    if (!country) return
    setStep(2)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) return
    setOpen(next)
  }

  if (!open) return null

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange} dismissible={false}>
      <ResponsiveDialogContent
        showCloseButton={false}
        className="flex max-h-[100dvh] md:max-h-[90vh] flex-col gap-0 p-0 sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <ResponsiveDialogHeader className="shrink-0 px-6 pt-6">
          <ResponsiveDialogTitle>{t("onboarding.title")}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {step === 1
              ? t("onboarding.countryDescription")
              : t("onboarding.brokerDescription", { currency: MARKET_CONFIG.baseCurrency })}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <DialogScrollBody>
          <div className="space-y-6 py-2">
            <OnboardingProgress step={step} />
            {step === 1 ? (
              <ProfileSetupFields
                step="country"
                setValue={setValue}
                errors={errors}
                country={country}
                brokerPresetId={brokerPresetId}
              />
            ) : (
              <form id="setup-form" onSubmit={handleSubmit(onSubmit)}>
                <ProfileSetupFields
                  step="broker"
                  setValue={setValue}
                  errors={errors}
                  country={country}
                  brokerPresetId={brokerPresetId}
                />
              </form>
            )}
          </div>
        </DialogScrollBody>

        <div className="flex flex-col-reverse gap-2 px-6 pb-6 pb-safe sm:flex-row sm:justify-between">
          {step === 2 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep(1)}
              disabled={complete.isPending}
            >
              {t("onboarding.back")}
            </Button>
          ) : (
            <div className="hidden sm:block" aria-hidden />
          )}
          {step === 1 ? (
            <Button type="button" onClick={handleContinue} disabled={!country}>
              {t("onboarding.continue")}
            </Button>
          ) : (
            <Button type="submit" form="setup-form" disabled={complete.isPending}>
              {complete.isPending ? t("onboarding.saving") : t("onboarding.finish")}
            </Button>
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
