export interface ApiErrorLike extends Error {
  status: number
}

export function isApiError(error: unknown): error is ApiErrorLike {
  return (
    error instanceof Error &&
    error.name === "ApiError" &&
    typeof (error as ApiErrorLike).status === "number"
  )
}

export function isSubscriptionRequiredError(error: unknown): boolean {
  return isApiError(error) && (error.status === 402 || error.status === 403)
}
