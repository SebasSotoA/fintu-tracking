"use client"

import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BrokerSelect } from "@/components/brokers/broker-select"
import { SettingsShell } from "@/components/settings/settings-shell"
import { SettingsSection } from "@/components/settings/settings-section"
import { SettingsRow } from "@/components/settings/settings-row"
import {
  SETTINGS_CATALOG,
  filterSettingsCatalog,
  type SettingsCategoryId,
} from "@/components/settings/settings-catalog"
import {
  profileSetupSchema,
  type ProfileSetupForm,
} from "@/components/onboarding/profile-setup-fields"
import { useUpdateProfile } from "@/hooks/use-update-profile"
import { MARKET_CONFIG, SUPPORTED_COUNTRIES, countryLabel } from "@/lib/market-config/market-config"
import type { Profile } from "@/lib/api/me"

interface ProfileConfigDialogProps {
  profile: Profile
  open: boolean
  onOpenChange: (open: boolean) => void
}

const THEME_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const

export function ProfileConfigDialog({ profile, open, onOpenChange }: ProfileConfigDialogProps) {
  const updateProfile = useUpdateProfile()
  const { theme, setTheme } = useTheme()
  const [query, setQuery] = useState("")
  const [activeId, setActiveId] = useState<SettingsCategoryId>("general")

  const snapshotCountry = profile.country || MARKET_CONFIG.defaultCountry
  const snapshotBroker = profile.broker_preset_id || MARKET_CONFIG.defaultBrokerId

  const {
    handleSubmit,
    control,
    setValue,
    formState: { errors },
    reset,
  } = useForm<ProfileSetupForm>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      country: snapshotCountry,
      brokerPresetId: snapshotBroker,
    },
  })

  const country = useWatch({ control, name: "country" })
  const brokerPresetId = useWatch({ control, name: "brokerPresetId" })

  const filtered = filterSettingsCatalog(SETTINGS_CATALOG, query)
  const effectiveId: SettingsCategoryId =
    filtered.find((category) => category.id === activeId)?.id ?? filtered[0]?.id ?? activeId
  const generalCategory = filtered.find((category) => category.id === "general")
  const accountCategory = filtered.find((category) => category.id === "account")
  const visibleAccountRowIds = new Set(
    accountCategory?.sections.flatMap((section) => section.rows.map((row) => row.id)) ?? [],
  )

  const isDirty = country !== snapshotCountry || brokerPresetId !== snapshotBroker
  const showFooter = effectiveId === "account" && isDirty
  const themeValue = theme ?? "dark"

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
      country: snapshotCountry,
      brokerPresetId: snapshotBroker,
    })
  }

  const handleOpenChange = (next: boolean) => {
    resetToProfile()
    setQuery("")
    setActiveId("general")
    onOpenChange(next)
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent className="flex max-h-[100dvh] flex-col gap-0 overflow-hidden p-0 pb-0! md:pb-0 md:max-h-[90vh] md:min-h-[36rem] sm:max-w-3xl">
        <SettingsShell
          header={
            <>
              <ResponsiveDialogHeader className="flex-1 space-y-0 p-0 text-left">
                <ResponsiveDialogTitle className="text-lg font-semibold leading-none text-foreground">
                  Settings
                </ResponsiveDialogTitle>
                <ResponsiveDialogDescription className="sr-only">
                  Change appearance and profile preferences.
                </ResponsiveDialogDescription>
              </ResponsiveDialogHeader>
              <ResponsiveDialogClose
                className="absolute top-4 right-4 flex min-h-10 min-w-10 items-center justify-center rounded-xs text-muted-foreground opacity-70 transition-opacity hover:opacity-100 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:hidden"
              >
                <XIcon className="size-4" />
                <span className="sr-only">Close</span>
              </ResponsiveDialogClose>
            </>
          }
          categories={filtered.map((category) => ({
            id: category.id,
            label: category.label,
            icon: category.icon,
          }))}
          activeId={effectiveId}
          onCategoryChange={setActiveId}
          query={query}
          onQueryChange={setQuery}
          footer={
            showFooter ? (
              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-background/40 px-6 py-4 pb-safe md:pb-4">
                <Button type="button" variant="outline" onClick={resetToProfile}>
                  Cancel
                </Button>
                <Button type="submit" form="profile-config-form" disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? "Saving..." : "Save changes"}
                </Button>
              </div>
            ) : undefined
          }
        >
          {filtered.length === 0 ? (
            <p className="flex flex-1 items-center justify-center px-6 py-16 text-sm text-muted-foreground">
              No matching settings
            </p>
          ) : null}

          {effectiveId === "general" && generalCategory ? (
            <div className="animate-in fade-in-0 duration-150 motion-reduce:animate-none">
              {generalCategory.sections.map((section, index) => (
                <SettingsSection key={section.id} heading={section.heading} isFirst={index === 0}>
                  {section.rows.map((row) =>
                    row.id === "theme" ? (
                      <SettingsRow key={row.id} htmlFor="theme" label={row.label}>
                        <Select value={themeValue} onValueChange={setTheme}>
                          <SelectTrigger
                            id="theme"
                            size="sm"
                            className="w-full min-w-32 justify-between sm:w-auto"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {THEME_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </SettingsRow>
                    ) : null,
                  )}
                </SettingsSection>
              ))}
            </div>
          ) : null}

          <form
            id="profile-config-form"
            onSubmit={handleSubmit(onSubmit)}
            hidden={effectiveId !== "account"}
            inert={effectiveId !== "account" || undefined}
            aria-hidden={effectiveId !== "account" || undefined}
            className={
              effectiveId === "account"
                ? "animate-in fade-in-0 duration-150 motion-reduce:animate-none"
                : undefined
            }
          >
            {SETTINGS_CATALOG.find((category) => category.id === "account")?.sections.map((section, index) => (
              <SettingsSection key={section.id} heading={section.heading} isFirst={index === 0}>
                {section.rows.map((row) => {
                  const rowVisible = effectiveId === "account" && visibleAccountRowIds.has(row.id)
                  const rowInert = !rowVisible || undefined

                  if (row.id === "country") {
                    return (
                      <div key={row.id} hidden={!rowVisible} inert={rowInert} aria-hidden={rowInert}>
                        <SettingsRow htmlFor="country" label={row.label}>
                          <Select
                            value={country}
                            onValueChange={(value) => {
                              setValue("country", value)
                              setValue("brokerPresetId", "")
                            }}
                          >
                            <SelectTrigger id="country" size="sm" className="w-full min-w-32 justify-between sm:w-auto">
                              <SelectValue placeholder="Choose your country" />
                            </SelectTrigger>
                            <SelectContent>
                              {SUPPORTED_COUNTRIES.map((code) => (
                                <SelectItem key={code} value={code}>
                                  {countryLabel(code)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </SettingsRow>
                        {errors.country ? (
                          <p className="px-4 pb-3 text-destructive text-sm">{errors.country.message}</p>
                        ) : null}
                      </div>
                    )
                  }

                  return (
                    <div key={row.id} hidden={!rowVisible} inert={rowInert} aria-hidden={rowInert}>
                      <SettingsRow htmlFor="brokerPresetId" label={row.label}>
                        <BrokerSelect
                          id="brokerPresetId"
                          value={brokerPresetId}
                          onChange={(value) => setValue("brokerPresetId", value)}
                          country={country}
                          hideLabel
                        />
                      </SettingsRow>
                      {errors.brokerPresetId ? (
                        <p className="px-4 pb-3 text-destructive text-sm">{errors.brokerPresetId.message}</p>
                      ) : null}
                    </div>
                  )
                })}
              </SettingsSection>
            ))}
          </form>
        </SettingsShell>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
