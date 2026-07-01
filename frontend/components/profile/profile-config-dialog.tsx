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
      toast.success("Perfil actualizado")
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar el perfil")
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
      <ResponsiveDialogContent className="max-h-[100dvh] md:max-h-[90vh] sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Mi cuenta</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Actualiza tu país y broker para personalizar tu experiencia.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogScrollBody>
            <ProfileSetupFields
              step="all"
              setValue={setValue}
              errors={errors}
              country={country}
              brokerPresetId={brokerPresetId}
            />
          </DialogScrollBody>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
