import { isLocale, type Locale } from "./types"

export const LOCALE_COOKIE_NAME = "fintu-locale"

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

export function readLocaleCookie(cookieSource?: string): Locale | null {
  const source =
    cookieSource ?? (typeof document !== "undefined" ? document.cookie : "")
  const match = source.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE_NAME}=([^;]*)`))
  if (!match) {
    return null
  }
  const value = decodeURIComponent(match[1].trim())
  return isLocale(value) ? value : null
}

export function writeLocaleCookie(locale: Locale): void {
  if (typeof document === "undefined") {
    return
  }
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`
}
