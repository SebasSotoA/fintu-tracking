import { createClient } from "@/lib/supabase/server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export interface ApiError {
  error: string
}

async function getAuthToken(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token || null
}

async function serverRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken()

  if (!token) {
    throw new Error("Not authenticated")
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers,
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    cache: "no-store", // Disable caching for dynamic data
  })

  if (!response.ok) {
    const errorData: ApiError = await response.json().catch(() => ({
      error: response.statusText,
    }))
    throw new Error(errorData.error || `API error: ${response.status}`)
  }

  return response.json()
}

export async function serverGet<T>(endpoint: string): Promise<T> {
  return serverRequest<T>(endpoint, {
    method: "GET",
  })
}

export async function serverPost<T>(endpoint: string, data: unknown): Promise<T> {
  return serverRequest<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function serverPut<T>(endpoint: string, data: unknown): Promise<T> {
  return serverRequest<T>(endpoint, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function serverDelete<T>(endpoint: string): Promise<T> {
  return serverRequest<T>(endpoint, {
    method: "DELETE",
  })
}

