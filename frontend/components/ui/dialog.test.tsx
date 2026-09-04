import { describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog"

describe("Dialog", () => {
  it("keeps 1.5rem bottom padding and does not use pb-safe", () => {
    renderWithLocale(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Body</DialogDescription>
        </DialogContent>
      </Dialog>,
    )

    const content = document.querySelector("[data-slot=dialog-content]")
    expect(content).toHaveClass("pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]")
    expect(content).not.toHaveClass("pb-safe")
  })

  it("uses a translated sr-only Close label", () => {
    renderWithLocale(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Body</DialogDescription>
        </DialogContent>
      </Dialog>,
    )
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument()
  })

  it("uses Cerrar for the close button when locale is es", () => {
    renderWithLocale(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Body</DialogDescription>
        </DialogContent>
      </Dialog>,
      { locale: "es" },
    )
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument()
  })
})
