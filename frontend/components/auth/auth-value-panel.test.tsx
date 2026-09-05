import { describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import { AuthValuePanel } from "./auth-value-panel"

describe("AuthValuePanel", () => {
  it("renders the English value-prop quote without body copy", () => {
    renderWithLocale(<AuthValuePanel />)

    const panel = screen.getByRole("complementary", { hidden: true, name: "Why Fintu" })
    expect(panel).toBeInTheDocument()
    expect(panel).toHaveClass("bg-primary-container", "text-foreground", "text-left", "justify-center")
    expect(panel).not.toHaveClass("bg-slate-200")
    expect(panel).not.toHaveClass("text-center")
    const decorativeQuote = panel.querySelector("[aria-hidden]")
    expect(decorativeQuote).toHaveTextContent("\u201C")
    expect(decorativeQuote).toHaveClass("absolute", "-left-1", "-top-4", "font-serif")
    expect(decorativeQuote?.className).toContain("text-primary/40")
    expect(decorativeQuote?.className).not.toContain("slate")
    expect(decorativeQuote).not.toHaveTextContent("?")
    const quote = panel.querySelector("blockquote")
    expect(quote).toHaveTextContent("After fees and FX, are you making or losing?")
    expect(quote?.className).not.toContain("slate")
    expect(quote?.className).not.toContain("text-slate-950")
    expect(quote?.className).not.toContain("text-slate-500")
    expect(panel).not.toHaveTextContent("ledger that tells the truth")
    expect(panel).not.toHaveTextContent("You deposit pesos")
  })

  it("renders the Spanish value-prop quote when locale is es", () => {
    renderWithLocale(<AuthValuePanel />, { locale: "es" })

    const panel = screen.getByRole("complementary", { hidden: true, name: "Por qué Fintu" })
    expect(panel).toBeInTheDocument()
    expect(panel).toHaveClass("bg-primary-container")
    expect(panel).not.toHaveClass("bg-slate-200")
    expect(panel).not.toHaveClass("text-center")
    expect(panel.querySelector("blockquote")).toHaveTextContent(
      "¿Después de comisiones y tipo de cambio, estás ganando o perdiendo?",
    )
    expect(panel).not.toHaveTextContent("Fintu es el libro que dice la verdad.")
  })
})
