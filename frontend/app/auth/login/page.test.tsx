import { describe, expect, it, vi, afterEach } from "vitest"
import { createElement, useEffect } from "react"
import { screen } from "@testing-library/react"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import LoginPage from "./page"

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
    auth: { signInWithPassword: vi.fn(), signInWithIdToken: vi.fn() },
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

describe("LoginPage", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    delete (window as { google?: unknown }).google
  })

  it("renders the English welcome title by default", () => {
    renderWithLocale(<LoginPage />)

    expect(screen.getByText("Welcome back")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument()
  })

  it("renders the Spanish welcome title when locale is es", () => {
    renderWithLocale(<LoginPage />, { locale: "es" })

    expect(screen.getByText("Bienvenido de nuevo")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeInTheDocument()
  })

  it("keeps email login only when the Google client id is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "")
    renderWithLocale(<LoginPage />)

    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email")
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password")
    expect(screen.queryByText("or")).not.toBeInTheDocument()
    expect(screen.queryByTestId("gis-script")).not.toBeInTheDocument()
  })

  it("shows Google sign-in above the email form when the client id is set", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "test-google-client-id")
    installGis()
    renderWithLocale(<LoginPage />)

    expect(screen.getByTestId("gis-script")).toBeInTheDocument()
    expect(screen.getByText("or")).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument()
  })

  it("renders the split card and English value panel", () => {
    const { container } = renderWithLocale(<LoginPage />)

    expect(container.querySelector(".auth-light")?.className).toContain("max-w-4xl")
    const panel = screen.getByRole("complementary", { hidden: true, name: "Why Fintu" })
    expect(panel).toHaveTextContent("After fees and FX, making or losing?")
    expect(screen.getByRole("button", { name: "Show password" })).toBeInTheDocument()
  })

  it("renders the Spanish value panel when locale is es", () => {
    renderWithLocale(<LoginPage />, { locale: "es" })

    const panel = screen.getByRole("complementary", { hidden: true, name: "Por qué Fintu" })
    expect(panel).toHaveTextContent(
      "¿Después de comisiones y tipo de cambio, estás ganando o perdiendo?",
    )
  })
})
