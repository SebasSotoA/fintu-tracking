"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { catalogs } from "@/lib/i18n/catalogs"
import { writeLocaleCookie } from "@/lib/i18n/cookie"
import { detectLocale } from "@/lib/i18n/detect"
import { t as translate } from "@/lib/i18n/t"
import {
  DEFAULT_LOCALE,
  type InterpolationVars,
  type Locale,
  type MessageKey,
} from "@/lib/i18n/types"

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: MessageKey, vars?: InterpolationVars) => string
}

interface LocaleProviderProps {
  children: ReactNode
  defaultLocale?: Locale
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children, defaultLocale }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    getInitialLocale(defaultLocale),
  )

  useEffect(() => {
    if (defaultLocale !== undefined) {
      return
    }
    const detected = detectLocale()
    setLocaleState((current) => (current === detected ? current : detected))
  }, [defaultLocale])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    writeLocaleCookie(next)
    setLocaleState(next)
  }, [])

  const t = useCallback(
    (key: MessageKey, vars?: InterpolationVars): string => {
      return translate(catalogs[locale], key, vars)
    },
    [locale],
  )

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider")
  }
  return context
}

function getInitialLocale(forced?: Locale): Locale {
  if (forced !== undefined) {
    return forced
  }
  if (typeof document === "undefined") {
    return DEFAULT_LOCALE
  }
  return detectLocale()
}
