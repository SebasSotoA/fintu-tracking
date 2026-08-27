"use client"

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
import {
  ProfileSetupFields,
  profileSetupSchema,
  type ProfileSetupForm,
} from "@/components/onboarding/profile-setup-fields"
import { useUpdateProfile } from "@/hooks/use-update-profile"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"
import type { Profile } from "@/lib/api/me"

interface ProfileConfigDialogProps {
  profile: Profile
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProfileConfigDialog({ profile, open, onOpenChange }: ProfileConfigDialogProps) {
  const updateProfile = useUpdateProfile()

  const {
    handleSubmit,
    control,
    setValue,
    formState: { errors },
    reset,
  } = useForm<ProfileSetupForm>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      country: profile.country || MARKET_CONFIG.defaultCountry,
      brokerPresetId: profile.broker_preset_id || MARKET_CONFIG.defaultBrokerId,
    },
  })

  const country = useWatch({ control, name: "country" })
  const brokerPresetId = useWatch({ control, name: "brokerPresetId" })

  const onSubmit = async (values: ProfileSetupForm) => {
    try {
      await updateProfile.mutateAsync({
        country: values.country,
        broker_preset_id: values.brokerPresetId,
      })
      toast.success("Profile updated")
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update profile")
    }
  }

  const resetToProfile = () => {
    reset({
      country: profile.country || MARKET_CONFIG.defaultCountry,
      brokerPresetId: profile.broker_preset_id || MARKET_CONFIG.defaultBrokerId,
    })
  }

  const handleOpenChange = (next: boolean) => {
    resetToProfile()
    onOpenChange(next)
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent className="flex max-h-[100dvh] md:max-h-[90vh] flex-col gap-0 p-0 sm:max-w-md">
        <ResponsiveDialogHeader className="shrink-0 px-6 pt-6">
          <ResponsiveDialogTitle>My account</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Update your country and broker to personalize your experience.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <DialogScrollBody>
          <form id="profile-config-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <ProfileSetupFields
              step="all"
              setValue={setValue}
              errors={errors}
              country={country}
              brokerPresetId={brokerPresetId}
            />
          </form>
        </DialogScrollBody>

        <div className="flex flex-col-reverse gap-2 px-6 pb-6 pb-safe sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="profile-config-form" disabled={updateProfile.isPending}>
            {updateProfile.isPending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
