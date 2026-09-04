import { describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import { Spinner } from "./spinner"

describe("Spinner", () => {
  it("uses a translated loading aria-label", () => {
    renderWithLocale(<Spinner />)
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument()
  })

  it("uses Cargando when locale is es", () => {
    renderWithLocale(<Spinner />, { locale: "es" })
    expect(screen.getByRole("status", { name: "Cargando" })).toBeInTheDocument()
  })
})
