import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import { createElement, useEffect } from "react"
import { renderWithLocale } from "@/lib/i18n/test-utils"

const mockPush = vi.fn()
const mockRefresh = vi.fn()
const mockSignInWithIdToken = vi.fn()
const mockInitialize = vi.fn()
const mockRenderButton = vi.fn()
const mockCancel = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

vi.mock("next/script", () => ({
  default: function Script({
    src,
    onLoad,
  }: {
    src?: string
    onLoad?: () => void
  }) {
    useEffect(() => {
      onLoad?.()
    }, [onLoad])
    return createElement("div", { "data-testid": "gis-script", "data-src": src })
  },
}))

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signInWithIdToken: mockSignInWithIdToken },
  }),
}))

function installGis(): void {
  Object.defineProperty(window, "google", {
    configurable: true,
    writable: true,
    value: {
      accounts: {
        id: {
          initialize: mockInitialize,
          renderButton: mockRenderButton,
          cancel: mockCancel,
        },
      },
    },
  })
}

async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value)
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded)
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

describe("GoogleSignInButton", () => {
  beforeEach(() => {
    mockPush.mockReset()
    mockRefresh.mockReset()
    mockSignInWithIdToken.mockReset()
    mockInitialize.mockReset()
    mockRenderButton.mockReset()
    mockCancel.mockReset()
    mockSignInWithIdToken.mockResolvedValue({ data: { session: {} }, error: null })
    installGis()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    delete (window as { google?: unknown }).google
  })

  it("renders nothing when the Google client id is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "")
    const { GoogleSignInButton } = await import("./google-sign-in-button")

    const { container } = renderWithLocale(<GoogleSignInButton />)

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByTestId("gis-script")).not.toBeInTheDocument()
  })

  it("signs in with the Google credential and redirects to the dashboard", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "test-google-client-id")
    const { GoogleSignInButton } = await import("./google-sign-in-button")

    renderWithLocale(<GoogleSignInButton />)

    await waitFor(() => {
      expect(mockInitialize).toHaveBeenCalled()
    })

    const gisConfig = mockInitialize.mock.calls[0]?.[0] as {
      client_id: string
      callback: (response: { credential: string }) => Promise<void> | void
      nonce: string
    }
    expect(gisConfig.client_id).toBe("test-google-client-id")
    expect(gisConfig.nonce).toMatch(/^[a-f0-9]{64}$/)
    expect(mockRenderButton).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ theme: "outline" }),
    )

    await gisConfig.callback({ credential: "google-id-token" })

    await waitFor(() => {
      expect(mockSignInWithIdToken).toHaveBeenCalledWith({
        provider: "google",
        token: "google-id-token",
        nonce: expect.any(String),
      })
    })

    const rawNonce = mockSignInWithIdToken.mock.calls[0]?.[0].nonce as string
    expect(rawNonce).not.toBe(gisConfig.nonce)
    expect(await sha256Hex(rawNonce)).toBe(gisConfig.nonce)
    expect(mockPush).toHaveBeenCalledWith("/dashboard")
    expect(mockRefresh).toHaveBeenCalled()
  })

  it("shows an AuthAlert when signInWithIdToken fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "test-google-client-id")
    mockSignInWithIdToken.mockResolvedValue({
      data: { session: null },
      error: { message: "invalid token" },
    })
    const { GoogleSignInButton } = await import("./google-sign-in-button")

    renderWithLocale(<GoogleSignInButton />)

    await waitFor(() => {
      expect(mockInitialize).toHaveBeenCalled()
    })

    const gisConfig = mockInitialize.mock.calls[0]?.[0] as {
      callback: (response: { credential: string }) => Promise<void> | void
    }
    await gisConfig.callback({ credential: "bad-token" })

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Google sign-in failed. Please try again.",
    )
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("places the continue-with divider above the Google button", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "test-google-client-id")
    const { GoogleSignInSection } = await import("./google-sign-in-button")

    renderWithLocale(<GoogleSignInSection />)

    const divider = screen.getByText("Or continue with")
    const gis = screen.getByTestId("gis-script")
    expect(divider.compareDocumentPosition(gis) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("does not throw on unmount when GIS cancel fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "test-google-client-id")
    mockCancel.mockImplementation(() => {
      throw new Error("One Tap is not displayed")
    })
    const { GoogleSignInButton } = await import("./google-sign-in-button")

    const { unmount } = renderWithLocale(<GoogleSignInButton />)

    await waitFor(() => {
      expect(mockInitialize).toHaveBeenCalled()
    })

    expect(() => {
      unmount()
    }).not.toThrow()
    expect(mockCancel).toHaveBeenCalled()
  })
})
