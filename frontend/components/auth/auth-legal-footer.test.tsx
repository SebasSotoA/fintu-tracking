import { describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import { AuthLegalFooter } from "./auth-legal-footer"

describe("AuthLegalFooter", () => {
  it("renders English terms and privacy links that go nowhere", () => {
    renderWithLocale(<AuthLegalFooter />)

    expect(screen.getByText((_, element) => {
      return element?.tagName === "P" &&
        element.textContent ===
          "By clicking continue, you agree to our Terms of Service and Privacy Policy."
    })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "#")
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "#")
  })

  it("renders Spanish terms and privacy when locale is es", () => {
    renderWithLocale(<AuthLegalFooter />, { locale: "es" })

    expect(screen.getByText((_, element) => {
      return element?.tagName === "P" &&
        element.textContent ===
          "Al continuar, aceptas nuestros Términos de servicio y Política de privacidad."
    })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Términos de servicio" })).toHaveAttribute("href", "#")
    expect(screen.getByRole("link", { name: "Política de privacidad" })).toHaveAttribute("href", "#")
  })

  it("uses navy ring-offset instead of primary on legal links", () => {
    renderWithLocale(<AuthLegalFooter />)

    const terms = screen.getByRole("link", { name: "Terms of Service" })
    expect(terms.className).toContain("underline")
    expect(terms.className).toContain("focus-visible:ring-2")
    expect(terms.className).toContain("focus-visible:ring-white/70")
    expect(terms.className).toContain("ring-offset-[#0B0F17]")
    expect(terms.className).not.toContain("ring-offset-primary")
  })

  it("centers muted white copy under the card", () => {
    const { container } = renderWithLocale(<AuthLegalFooter />)

    const footer = container.querySelector("p")
    expect(footer?.className).toContain("w-full")
    expect(footer?.className).toContain("max-w-md")
    expect(footer?.className).toContain("text-center")
    expect(footer?.className).toContain("text-xs")
    expect(footer?.className).toContain("text-white/80")
  })
})
