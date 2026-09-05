"use client"

import { useLocale } from "@/components/locale-provider"

export function AuthValuePanel(): React.ReactElement {
  const { t } = useLocale()

  return (
    <aside
      aria-label={t("auth.valuePanel.ariaLabel")}
      className="hidden md:flex flex-col items-center justify-center bg-muted p-8 text-center md:p-11"
    >
      <span
        aria-hidden
        className="select-none text-[clamp(3.5rem,8vw,6rem)] leading-none text-muted-foreground/40"
      >
        &ldquo;
      </span>
      <p className="text-pretty text-base font-medium leading-relaxed text-foreground md:text-lg">
        {t("auth.valuePanel.question")}
      </p>
    </aside>
  )
}
