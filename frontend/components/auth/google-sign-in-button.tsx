"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Script from "next/script"
import { useRouter } from "next/navigation"

import { AuthAlert } from "@/components/auth/auth-alert"
import { useLocale } from "@/components/locale-provider"
import { getGoogleClientId } from "@/lib/auth/google-client-id"
import { createClient } from "@/lib/supabase/client"

interface GsiClient {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string
        callback: (response: { credential: string }) => void
        nonce?: string
      }) => void
      renderButton: (
        parent: HTMLElement,
        options: {
          theme: "outline" | "filled_black" | "filled_blue"
          size: "large"
          text: "continue_with"
          locale: string
        },
      ) => void
      cancel?: () => void
    }
  }
}

export function GoogleSignInButton(): React.ReactElement | null {
  const clientId = getGoogleClientId()
  const router = useRouter()
  const { locale, t } = useLocale()
  const [error, setError] = useState<string | null>(null)
  const [gisReady, setGisReady] = useState(false)
  const buttonRef = useRef<HTMLDivElement>(null)

  const handleGisLoaded = useCallback(() => {
    setGisReady(true)
  }, [])

  useEffect(() => {
    if (getGisClient()) {
      setGisReady(true)
    }
  }, [])

  useEffect(() => {
    const googleId = getGisClient()
    const container = buttonRef.current
    if (!gisReady || !clientId || !googleId || !container) {
      return
    }

    const resolvedClientId = clientId
    const gis = googleId
    const buttonContainer = container
    let cancelled = false

    async function start(): Promise<void> {
      const nonce = generateNonce()
      const hashedNonce = await sha256Hex(nonce)
      if (cancelled) {
        return
      }

      gis.initialize({
        client_id: resolvedClientId,
        nonce: hashedNonce,
        callback: (response) => {
          setError(null)
          void signInWithGoogleCredential({
            token: response.credential,
            nonce,
            cancelled: () => cancelled,
            onError: () => setError(t("auth.google.error")),
            onSuccess: () => {
              router.push("/dashboard")
              router.refresh()
            },
          })
        },
      })

      gis.renderButton(buttonContainer, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        locale,
      })
    }

    void start()

    return () => {
      cancelled = true
      try {
        gis.cancel?.()
      } catch {
        // cancel() is One Tap-oriented; renderButton-only usage may throw
      }
      buttonContainer.innerHTML = ""
    }
  }, [clientId, gisReady, locale, router, t])

  if (!clientId) {
    return null
  }

  return (
    <div className="space-y-4">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={handleGisLoaded}
      />
      <div ref={buttonRef} className="flex w-full justify-center" />
      <AuthAlert error={error} />
    </div>
  )
}

export function GoogleSignInSection(): React.ReactElement | null {
  const { t } = useLocale()

  if (!getGoogleClientId()) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-foreground/35">
        <span className="relative z-10 bg-background px-2 text-xs text-muted-foreground">
          {t("auth.google.or")}
        </span>
      </div>
      <GoogleSignInButton />
    </div>
  )
}

function getGisClient(): GsiClient["accounts"]["id"] | undefined {
  if (typeof window === "undefined") {
    return undefined
  }
  const google = (window as Window & { google?: GsiClient }).google
  return google?.accounts.id
}

function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes))
}

async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value)
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded)
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

async function signInWithGoogleCredential({
  token,
  nonce,
  cancelled,
  onError,
  onSuccess,
}: {
  token: string
  nonce: string
  cancelled: () => boolean
  onError: () => void
  onSuccess: () => void
}): Promise<void> {
  if (!token) {
    onError()
    return
  }

  try {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token,
      nonce,
    })
    if (error) {
      throw error
    }
    if (cancelled()) {
      return
    }
    onSuccess()
  } catch {
    if (cancelled()) {
      return
    }
    onError()
  }
}
