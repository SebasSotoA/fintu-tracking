"use client"

import type { ReactElement } from "react"
import { useLocale } from "@/components/locale-provider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const NAVY_SWITCH_CLASS =
  "hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/70 dark:hover:bg-white/10 dark:hover:text-white"

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
        className={cn(
          NAVY_SWITCH_CLASS,
          locale === "en" ? "text-white font-medium" : "text-white/60",
        )}
      >
        English
      </Button>
      <span className="text-white/40" aria-hidden>
        |
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-pressed={locale === "es"}
        onClick={() => setLocale("es")}
        className={cn(
          NAVY_SWITCH_CLASS,
          locale === "es" ? "text-white font-medium" : "text-white/60",
        )}
      >
        Español
      </Button>
    </div>
  )
}
