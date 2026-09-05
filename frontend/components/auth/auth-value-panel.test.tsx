import { describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import { AuthValuePanel } from "./auth-value-panel"

describe("AuthValuePanel", () => {
  it("renders the English value-prop quote without body copy", () => {
    renderWithLocale(<AuthValuePanel />)

    const panel = screen.getByRole("complementary", { hidden: true, name: "Why Fintu" })
    expect(panel).toBeInTheDocument()
    expect(panel).toHaveClass("items-center", "justify-center", "text-center")
    const decorativeQuote = panel.querySelector("[aria-hidden]")
    expect(decorativeQuote).toHaveTextContent("\u201C")
    expect(decorativeQuote).not.toHaveTextContent("?")
    expect(panel).toHaveTextContent("After fees and FX, are you making or losing?")
    expect(panel).not.toHaveTextContent("ledger that tells the truth")
    expect(panel).not.toHaveTextContent("You deposit pesos")
  })

  it("renders the Spanish value-prop quote when locale is es", () => {
    renderWithLocale(<AuthValuePanel />, { locale: "es" })

    const panel = screen.getByRole("complementary", { hidden: true, name: "Por qué Fintu" })
    expect(panel).toBeInTheDocument()
    expect(panel).toHaveTextContent(
      "¿Después de comisiones y tipo de cambio, estás ganando o perdiendo?",
    )
    expect(panel).not.toHaveTextContent("Fintu es el libro que dice la verdad.")
  })
})
