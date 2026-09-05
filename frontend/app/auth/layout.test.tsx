import { describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import AuthLayout from "./layout"

vi.mock("@/components/auth/aurora", () => ({
  default: function AuroraMock() {
    return <div data-testid="aurora-mock" />
  },
}))

vi.mock("next/dynamic", () => ({
  default: () =>
    function DynamicAurora() {
      return <div data-testid="aurora-mock" />
    },
}))

describe("AuthLayout", () => {
  it("shows a compact English Español control before login", () => {
    renderWithLocale(
      <AuthLayout>
        <div>login-child</div>
      </AuthLayout>,
    )

    expect(screen.getByRole("button", { name: "English" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Español" })).toBeInTheDocument()
    expect(screen.getByText("login-child")).toBeInTheDocument()
  })

  it("uses a navy h-svh shell with aurora, without a blur orb or primary fill", () => {
    const { container } = renderWithLocale(
      <AuthLayout>
        <div>login-child</div>
      </AuthLayout>,
    )

    const shell = container.querySelector("main")
    expect(shell).toBeInTheDocument()
    expect(shell?.className).toContain("auth-shell")
    expect(shell?.className).toContain("h-svh")
    expect(shell?.className).not.toContain("bg-primary")
    expect(container.querySelector(".blur-3xl")).not.toBeInTheDocument()
    expect(container.querySelector('[class*="max-w-[420px]"]')).not.toBeInTheDocument()
    expect(screen.getByTestId("aurora-mock")).toBeInTheDocument()
  })

  it("keeps the language switch on the navy shell, not inside auth-light", () => {
    const { container } = renderWithLocale(
      <AuthLayout>
        <div>login-child</div>
      </AuthLayout>,
    )

    const langSwitch = screen.getByRole("group", { name: "Language" })
    expect(langSwitch.className).toContain("absolute")
    expect(langSwitch.className).toContain("right-4")
    expect(langSwitch.className).toContain("top-4")
    expect(langSwitch.className).toContain("z-20")
    expect(langSwitch.closest(".auth-light")).toBeNull()
    expect(container.querySelector(".auth-light")).not.toBeInTheDocument()
  })
})
