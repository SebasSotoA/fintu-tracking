"use client"

import { useLocale } from "@/components/locale-provider"

export function AuthValuePanel(): React.ReactElement {
  const { t } = useLocale()

  return (
    <aside
      className="relative hidden h-full min-h-0 flex-col justify-center bg-gray-200 p-8 text-left text-foreground md:flex md:p-11"
      aria-label={t("auth.valuePanel.ariaLabel")}
    >
      <div className="w-full min-w-0">
        <div className="relative">
          <span
            className="pointer-events-none absolute -left-1 -top-4 select-none font-serif text-[clamp(3.5rem,8vw,6rem)] leading-none tracking-tight text-primary/40"
            aria-hidden
          >
            &ldquo;
          </span>
          <blockquote className="relative z-10 mb-0 pt-6 text-pretty text-base font-normal leading-relaxed text-foreground md:text-lg md:leading-relaxed">
            {t("auth.valuePanel.question")}
          </blockquote>
        </div>
      </div>
    </aside>
  )
}
