"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
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
  onSetupComplete?: (profile: Profile) => void
  forceOpen?: boolean
}

export function SetupModal({ initialProfile, onSetupComplete, forceOpen = false }: SetupModalProps) {
  const router = useRouter()
  const complete = useCompleteOnboarding()
  const { t } = useLocale()
  const [step, setStep] = useState<SetupStep>(1)
  const [open, setOpen] = useState(!initialProfile.onboarding_completed || forceOpen)

  const {
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ProfileSetupForm>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      country: initialProfile.country || MARKET_CONFIG.defaultCountry,
      brokerPresetId: initialProfile.broker_preset_id || MARKET_CONFIG.defaultBrokerId,
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
      onSetupComplete?.(updatedProfile)
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

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (step === 1) {
      handleContinue()
      return
    }
    void handleSubmit(onSubmit)()
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
        className="!flex flex max-h-[100dvh] md:max-h-[90vh] flex-col gap-0 p-0 sm:max-w-md"
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

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleFormSubmit}>
          <DialogScrollBody className="min-h-0 flex-1">
            <div className="space-y-6 py-2">
              <OnboardingProgress step={step} />
              <ProfileSetupFields
                step={step === 1 ? "country" : "broker"}
                setValue={setValue}
                errors={errors}
                country={country}
                brokerPresetId={brokerPresetId}
              />
            </div>
          </DialogScrollBody>

          <ResponsiveDialogFooter className="shrink-0 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:justify-between">
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
            <Button type="submit" disabled={step === 1 ? !country : complete.isPending}>
              {step === 1
                ? t("onboarding.continue")
                : complete.isPending
                  ? t("onboarding.saving")
                  : t("onboarding.finish")}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
