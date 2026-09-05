import { describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import { AuthValuePanel } from "./auth-value-panel"

describe("AuthValuePanel", () => {
  it("renders the English value-prop copy", () => {
    renderWithLocale(<AuthValuePanel />)

    const panel = screen.getByRole("complementary", { hidden: true, name: "Why Fintu" })
    expect(panel).toBeInTheDocument()
    expect(panel).toHaveTextContent("After fees and FX, making or losing?")
    expect(panel).toHaveTextContent("Fintu is the ledger that tells the truth.")
  })

  it("renders the Spanish value-prop copy when locale is es", () => {
    renderWithLocale(<AuthValuePanel />, { locale: "es" })

    const panel = screen.getByRole("complementary", { hidden: true, name: "Por qué Fintu" })
    expect(panel).toBeInTheDocument()
    expect(panel).toHaveTextContent(
      "¿Después de comisiones y tipo de cambio, estás ganando o perdiendo?",
    )
    expect(panel).toHaveTextContent("Fintu es el libro que dice la verdad.")
  })
})
