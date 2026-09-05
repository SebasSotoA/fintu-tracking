export function getGoogleClientId(): string | undefined {
  const value = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  if (typeof value !== "string") {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}
