import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { SettingsRow } from "./settings-row"

describe("SettingsRow", () => {
  it("renders the label on the left and the control on the right with htmlFor/id pairing", () => {
    render(
      <SettingsRow htmlFor="theme" label="Theme">
        <select id="theme" data-testid="theme-control">
          <option value="dark">Dark</option>
        </select>
      </SettingsRow>,
    )

    const label = screen.getByText("Theme")
    expect(label.tagName).toBe("LABEL")
    expect(label).toHaveAttribute("for", "theme")
    expect(screen.getByTestId("theme-control")).toHaveAttribute("id", "theme")
  })

  it("stacks on small screens so wide controls do not overflow", () => {
    render(
      <SettingsRow htmlFor="theme" label="Theme">
        <select id="theme" />
      </SettingsRow>,
    )

    const row = screen.getByText("Theme").parentElement
    expect(row).toHaveClass("flex-col")
    expect(row).toHaveClass("sm:flex-row")
    expect(row).toHaveClass("sm:justify-between")
  })
})
