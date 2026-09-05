export function productIntroSeenKey(userId: string): string {
  return `fintu:product-intro-seen:${userId}`
}

export function productIntroPendingKey(userId: string): string {
  return `fintu:product-intro-pending:${userId}`
}

export function hasSeenProductIntro(userId: string): boolean {
  try {
    return localStorage.getItem(productIntroSeenKey(userId)) != null
  } catch {
    return false
  }
}

export function isProductIntroPending(userId: string): boolean {
  try {
    return sessionStorage.getItem(productIntroPendingKey(userId)) != null
  } catch {
    return false
  }
}

export function markProductIntroPending(userId: string): void {
  try {
    sessionStorage.setItem(productIntroPendingKey(userId), "1")
  } catch {
    /* ignore quota / private mode */
  }
}

export function markProductIntroSeen(userId: string): void {
  try {
    localStorage.setItem(productIntroSeenKey(userId), "1")
    sessionStorage.removeItem(productIntroPendingKey(userId))
  } catch {
    /* ignore quota / private mode */
  }
}
