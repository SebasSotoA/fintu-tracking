"use client"

import { useLocale } from "@/components/locale-provider"

export function AuthValuePanel(): React.ReactElement {
  const { t } = useLocale()

  return (
    <aside
      aria-label={t("auth.valuePanel.ariaLabel")}
      className="hidden flex-col justify-between bg-muted p-8 md:flex md:p-11"
    >
      <span
        aria-hidden
        className="select-none font-mono text-[clamp(3.5rem,8vw,6rem)] text-primary/25"
      >
        ?
      </span>
      <div className="flex flex-col gap-4">
        <p className="text-pretty text-base font-medium leading-relaxed md:text-lg">
          {t("auth.valuePanel.question")}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("auth.valuePanel.body")}
        </p>
        <p className="font-mono text-sm font-medium text-primary">
          {t("auth.valuePanel.closer")}
        </p>
      </div>
    </aside>
  )
}
