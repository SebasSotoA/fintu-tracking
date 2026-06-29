import { createClient } from "@/lib/supabase/client"

if (!process.env.NEXT_PUBLIC_API_URL && process.env.NODE_ENV === "production") {
  throw new Error("Missing required environment variable: NEXT_PUBLIC_API_URL")
}
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export interface ApiErrorResponse {
  error: string
  retry_after?: number
}

export class ApiError extends Error {
  status: number
  retryAfter?: number

  constructor(message: string, status: number, retryAfter?: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.retryAfter = retryAfter
  }
}

export class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl
  }

  private async getAuthToken(): Promise<string | null> {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session?.access_token || null
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAuthToken()

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorData: ApiErrorResponse = await response.json().catch(() => ({
        error: response.statusText,
      }))
      const retryAfterHeader = response.headers.get("Retry-After")
      const retryAfter = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : errorData.retry_after
      throw new ApiError(
        errorData.error || `API error: ${response.status}`,
        response.status,
        retryAfter !== undefined && Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
      )
    }

    return response.json()
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: "GET",
    })
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async patch<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: "DELETE",
    })
  }
}

export const apiClient = new ApiClient()

// Alias for consistency
export const api = apiClient
