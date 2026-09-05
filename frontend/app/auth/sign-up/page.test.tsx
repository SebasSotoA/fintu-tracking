import { describe, expect, it, vi, afterEach } from "vitest"
import { createElement, useEffect } from "react"
import { screen } from "@testing-library/react"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import SignUpPage from "./page"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
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
    auth: { signUp: vi.fn(), signInWithIdToken: vi.fn() },
  }),
}))

function installGis(): void {
  Object.defineProperty(window, "google", {
    configurable: true,
    writable: true,
    value: {
      accounts: {
        id: {
          initialize: vi.fn(),
          renderButton: vi.fn(),
          cancel: vi.fn(),
        },
      },
    },
  })
}

describe("SignUpPage", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    delete (window as { google?: unknown }).google
  })

  it("renders the email sign-up form", () => {
    renderWithLocale(<SignUpPage />)

    expect(screen.getByRole("heading", { level: 1, name: "Create account" })).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email")
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "new-password")
    expect(screen.getByLabelText("Confirm Password")).toHaveAttribute(
      "autocomplete",
      "new-password",
    )
    expect(screen.getByRole("button", { name: "Sign up" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Fintu" })).not.toBeInTheDocument()
  })

  it("keeps email sign-up only when the Google client id is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "")
    renderWithLocale(<SignUpPage />)

    expect(screen.getByLabelText("Email")).toBeInTheDocument()
    expect(screen.queryByText("Or continue with")).not.toBeInTheDocument()
    expect(screen.queryByTestId("gis-script")).not.toBeInTheDocument()
  })

  it("renders the split card and value panel", () => {
    const { container } = renderWithLocale(<SignUpPage />)

    expect(container.querySelector(".auth-light")?.className).toContain("max-w-4xl")
    expect(
      screen.getByRole("complementary", { hidden: true, name: "Why Fintu" }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Show password" })).toHaveLength(2)
    expect(screen.queryByRole("link", { name: "Fintu" })).not.toBeInTheDocument()
  })

  it("shows Google sign-in below the sign-up button when the client id is set", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "test-google-client-id")
    installGis()
    renderWithLocale(<SignUpPage />)

    const heading = screen.getByRole("heading", { level: 1, name: "Create account" })
    const email = screen.getByLabelText("Email")
    const signUp = screen.getByRole("button", { name: "Sign up" })
    const orContinue = screen.getByText("Or continue with")

    expect(screen.getByTestId("gis-script")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Fintu" })).not.toBeInTheDocument()
    expect(heading.compareDocumentPosition(email) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(email.compareDocumentPosition(signUp) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(signUp.compareDocumentPosition(orContinue) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
