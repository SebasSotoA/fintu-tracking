import { describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import AuthLayout from "./layout"

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
})
