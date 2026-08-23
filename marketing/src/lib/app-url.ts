export function appUrl(path: string): string {
  const base = import.meta.env.PUBLIC_APP_BASE_URL ?? "https://app.fintu.com"
  return `${base}${path}`
}