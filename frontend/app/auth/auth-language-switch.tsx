"use client"

import type { ReactElement } from "react"
import { useLocale } from "@/components/locale-provider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function AuthLanguageSwitch(): ReactElement {
  const { locale, setLocale, t } = useLocale()

  return (
    <div
      className="absolute right-4 top-4 z-20 flex items-center gap-1"
      role="group"
      aria-label={t("settings.language")}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-pressed={locale === "en"}
        onClick={() => setLocale("en")}
        className={cn(locale === "en" ? "text-foreground" : "text-muted-foreground")}
      >
        English
      </Button>
      <span className="text-muted-foreground" aria-hidden>
        |
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-pressed={locale === "es"}
        onClick={() => setLocale("es")}
        className={cn(locale === "es" ? "text-foreground" : "text-muted-foreground")}
      >
        Español
      </Button>
    </div>
  )
}
