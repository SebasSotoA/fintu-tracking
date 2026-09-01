import { readLocaleCookie } from "./cookie"
import { DEFAULT_LOCALE, type Locale } from "./types"

interface DetectLocaleInput {
  cookie?: string
  language?: string
}

export function detectLocale(input?: DetectLocaleInput): Locale {
  const fromCookie = readLocaleCookie(input?.cookie)
  if (fromCookie) {
    return fromCookie
  }

  const language =
    input?.language ??
    (typeof navigator !== "undefined" ? navigator.language : "")
  if (language.toLowerCase().startsWith("es")) {
    return "es"
  }

  return DEFAULT_LOCALE
}
