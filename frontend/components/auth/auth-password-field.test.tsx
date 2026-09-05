import { describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import { AuthPasswordField } from "./auth-password-field"

describe("AuthPasswordField", () => {
  it("toggles visibility with Show password and Hide password labels", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    renderWithLocale(
      <AuthPasswordField id="password" label="Password" value="secret" onChange={onChange} />,
    )

    const input = screen.getByLabelText("Password")
    expect(input).toHaveAttribute("type", "password")
    expect(screen.getByRole("button", { name: "Show password" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Show password" }))

    expect(input).toHaveAttribute("type", "text")
    expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument()
  })

  it("renders a forgot-password link on the label row when forgotHref is set", () => {
    renderWithLocale(
      <AuthPasswordField
        id="password"
        label="Password"
        value=""
        onChange={() => undefined}
        forgotHref="/auth/forgot-password"
        forgotLabel="Forgot password?"
      />,
    )

    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute(
      "href",
      "/auth/forgot-password",
    )
  })
})
