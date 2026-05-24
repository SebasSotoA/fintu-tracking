/** YYYY-MM-DD portion for HTML date inputs (API may return RFC3339 timestamps). */
export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return ""
  const day = value.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : ""
}

/** Format a calendar date for display without UTC shifting the day. */
export function formatCalendarDate(
  value: string | null | undefined,
  locale?: string | string[],
): string {
  const day = toDateInputValue(value)
  if (!day) return ""
  const [y, m, d] = day.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(locale)
}
