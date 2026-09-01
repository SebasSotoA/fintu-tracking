import { describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import LoginPage from "./page"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signInWithPassword: vi.fn() },
  }),
}))

describe("LoginPage", () => {
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
})
