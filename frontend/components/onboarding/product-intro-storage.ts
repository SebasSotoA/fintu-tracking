export function productIntroSeenKey(userId: string): string {
  return `fintu:product-intro-seen:${userId}`
}

export function productIntroPendingKey(userId: string): string {
  return `fintu:product-intro-pending:${userId}`
}

export function productTourStepKey(userId: string): string {
  return `fintu:product-tour-step:${userId}`
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

export function getProductTourStep(userId: string): number | null {
  try {
    const raw = sessionStorage.getItem(productTourStepKey(userId))
    if (raw == null) return null
    const parsed = Number.parseInt(raw, 10)
    if (!Number.isFinite(parsed) || parsed < 1) return null
    return parsed
  } catch {
    return null
  }
}

export function setProductTourStep(userId: string, step: number): void {
  try {
    sessionStorage.setItem(productTourStepKey(userId), String(step))
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearProductTourStep(userId: string): void {
  try {
    sessionStorage.removeItem(productTourStepKey(userId))
  } catch {
    /* ignore quota / private mode */
  }
}

export function markProductIntroSeen(userId: string): void {
  try {
    localStorage.setItem(productIntroSeenKey(userId), "1")
    sessionStorage.removeItem(productIntroPendingKey(userId))
    sessionStorage.removeItem(productTourStepKey(userId))
  } catch {
    /* ignore quota / private mode */
  }
}
