export function nextQueryCacheUserId(
  lastUserId: string | null | undefined,
  nextUserId: string | null,
): { lastUserId: string | null; shouldClear: boolean } {
  if (lastUserId === undefined) {
    return { lastUserId: nextUserId, shouldClear: false }
  }

  if (nextUserId === lastUserId) {
    return { lastUserId, shouldClear: false }
  }

  return { lastUserId: nextUserId, shouldClear: true }
}
