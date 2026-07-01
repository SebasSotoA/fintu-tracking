import { cache } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

if (!process.env.NEXT_PUBLIC_API_URL && process.env.NODE_ENV === "production") {
  throw new Error("Missing required environment variable: NEXT_PUBLIC_API_URL")
}
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export interface ApiErrorResponse {
  error: string
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = "ApiError"
  }
}

export function handleServerAuthError(error: unknown): never {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      redirect("/auth/login")
    }
    if (error.status === 402 || error.status === 403) {
      redirect("/subscription")
    }
  }
  throw error
}

const getAuthToken = cache(async (): Promise<string | null> => {
  const supabase = await createClient()
  // Verify the token is genuinely valid with Supabase before using it
  const { error } = await supabase.auth.getUser()
  if (error) return null
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token || null
})

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
    cache: "no-store",
  })

  if (!response.ok) {
    const errorData: ApiErrorResponse = await response.json().catch(() => ({
      error: response.statusText,
    }))
    throw new ApiError(errorData.error || `API error: ${response.status}`, response.status)
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

export async function serverPatch<T>(endpoint: string, data: unknown): Promise<T> {
  return serverRequest<T>(endpoint, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function serverDelete<T>(endpoint: string): Promise<T> {
  return serverRequest<T>(endpoint, {
    method: "DELETE",
  })
}

