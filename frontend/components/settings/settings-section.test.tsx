import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { SettingsSection } from "./settings-section"

describe("SettingsSection", () => {
  it("renders a mono ticker h3 and a bordered divided group", () => {
    render(
      <SettingsSection heading="APPEARANCE">
        <div>Theme row</div>
      </SettingsSection>,
    )

    const heading = screen.getByRole("heading", { level: 3, name: "APPEARANCE" })
    expect(heading).toHaveClass("font-mono")
    expect(heading).toHaveClass("uppercase")
    expect(heading).toHaveClass("tracking-widest")

    const group = heading.nextElementSibling
    expect(group).toHaveClass("rounded-xl")
    expect(group).toHaveClass("border")
    expect(group).toHaveClass("divide-y")
    expect(group).toHaveTextContent("Theme row")
  })

  it("does not add top margin on the first section and adds mt-6 on later ones", () => {
    const { rerender } = render(
      <SettingsSection heading="APPEARANCE" isFirst>
        <div>first</div>
      </SettingsSection>,
    )

    expect(screen.getByRole("heading", { name: "APPEARANCE" })).not.toHaveClass("mt-6")

    rerender(
      <SettingsSection heading="PROFILE">
        <div>later</div>
      </SettingsSection>,
    )

    expect(screen.getByRole("heading", { name: "PROFILE" })).toHaveClass("mt-6")
  })
})
