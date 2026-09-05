"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Script from "next/script"
import { useRouter } from "next/navigation"

import { AuthAlert } from "@/components/auth/auth-alert"
import { useLocale } from "@/components/locale-provider"
import { buttonVariants } from "@/components/ui/button"
import { getGoogleClientId } from "@/lib/auth/google-client-id"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

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
          width: number
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
  const wrapperRef = useRef<HTMLDivElement>(null)
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

      const measuredWidth = wrapperRef.current?.offsetWidth ?? 0
      gis.renderButton(buttonContainer, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        locale: locale === "es" ? "es" : "en",
        width: measuredWidth > 0 ? measuredWidth : 400,
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
      <div ref={wrapperRef} className="relative h-11 w-full">
        <div
          aria-hidden="true"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "pointer-events-none h-11 w-full rounded-lg",
          )}
        >
          <GoogleGlyph />
          {t("auth.google.continue")}
        </div>
        <div
          ref={buttonRef}
          data-testid="gis-overlay"
          className="pointer-events-auto absolute inset-0 z-10 overflow-hidden opacity-0"
        />
      </div>
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

function GoogleGlyph(): React.ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
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
