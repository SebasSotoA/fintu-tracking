"use client"

import type { ReactElement, ReactNode } from "react"

import { useLocale } from "@/components/locale-provider"

const LEGAL_LINK_CLASS =
  "inline text-inherit underline underline-offset-2 hover:text-white focus-visible:rounded-sm focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0F17]"

export function AuthLegalFooter(): ReactElement {
  const { t } = useLocale()

  const terms = (
    <a href="#" className={LEGAL_LINK_CLASS}>
      {t("auth.legal.terms")}
    </a>
  )
  const privacy = (
    <a href="#" className={LEGAL_LINK_CLASS}>
      {t("auth.legal.privacy")}
    </a>
  )

  return (
    <p className="w-full max-w-md shrink-0 px-1 text-pretty text-center text-xs leading-snug text-white/80">
      {renderAgreement(t("auth.legal.agreement"), { terms, privacy })}
    </p>
  )
}

function renderAgreement(
  template: string,
  slots: { terms: ReactNode; privacy: ReactNode },
): ReactNode[] {
  return template.split(/(\{terms\}|\{privacy\})/g).map((part, index) => {
    if (part === "{terms}") {
      return <span key={index}>{slots.terms}</span>
    }
    if (part === "{privacy}") {
      return <span key={index}>{slots.privacy}</span>
    }
    return <span key={index}>{part}</span>
  })
}
