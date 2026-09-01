import type { Locale } from "@/lib/i18n/types"

/** YYYY-MM-DD portion for HTML date inputs (API may return RFC3339 timestamps). */
export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return ""
  const day = value.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : ""
}

/** Map UI locale to the Intl locale used for dates (not money). */
export function intlLocale(locale: Locale): string {
  return locale === "es" ? "es-CO" : "en-US"
}

/** Format a calendar date for display without UTC shifting the day. */
export function formatCalendarDate(
  value: string | null | undefined,
  locale?: string | string[],
): string {
  const day = toDateInputValue(value)
  if (!day) return ""
  const [y, m, d] = day.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(locale ?? "en-US")
}

/** Chart/tooltip date label (e.g. "mon, may 24") without UTC day shift. */
export function formatTooltipDate(dateKey: string, locale: string = "en-US"): string {
  const date = parseDateKey(dateKey)
  if (!date) return dateKey

  const now = new Date()
  const msIn7Days = 7 * 24 * 60 * 60 * 1000
  const isRecent = now.getTime() - date.getTime() <= msIn7Days

  return date
    .toLocaleDateString(locale, {
      ...(isRecent ? { weekday: "short" as const } : {}),
      day: "numeric",
      month: "short",
    })
    .toLowerCase()
}

/** Axis/activity label: "Apr 26" / "26 abr". */
export function formatShortMonthDay(dateKey: string, locale: string = "en-US"): string {
  const date = parseDateKey(dateKey)
  if (!date) return dateKey
  return date.toLocaleDateString(locale, { month: "short", day: "numeric" })
}

/** Timeframe label: "Jan 15, 2026" / "15 ene 2026". */
export function formatShortMonthDayYear(dateKey: string, locale: string = "en-US"): string {
  const date = parseDateKey(dateKey)
  if (!date) return dateKey
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/** Chart tick: "Jan 2025" / "ene 2025". */
export function formatShortMonthYear(dateKey: string, locale: string = "en-US"): string {
  const date = parseDateKey(dateKey)
  if (!date) return dateKey
  return date.toLocaleDateString(locale, { month: "short", year: "numeric" })
}

/** Fee-chart month key "YYYY-MM" → "Jan 24" / "ene 24". */
export function formatShortMonthYear2Digit(monthKey: string, locale: string = "en-US"): string {
  const [year, month] = monthKey.split("-")
  if (!year || !month) return monthKey
  const date = new Date(Number(year), Number(month) - 1, 1)
  if (Number.isNaN(date.getTime())) return monthKey
  return date.toLocaleDateString(locale, { month: "short", year: "2-digit" })
}

/** Holdings "prices as of" timestamp with month names in the UI locale. */
export function formatDateTime(
  value: string | null | undefined,
  locale: string = "en-US",
): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleString(locale, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function listMonthNames(
  locale: string,
  width: "long" | "short" = "long",
): string[] {
  return Array.from({ length: 12 }, (_, monthIndex) =>
    new Date(2020, monthIndex, 1).toLocaleString(locale, { month: width }),
  )
}

function parseDateKey(dateKey: string): Date | null {
  const date = new Date(`${toDateInputValue(dateKey) || dateKey}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}
