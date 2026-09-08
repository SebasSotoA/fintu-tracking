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

  it("uses card glass instead of opaque page background", () => {
    renderWithLocale(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Body</DialogDescription>
        </DialogContent>
      </Dialog>,
    )

    const content = document.querySelector("[data-slot=dialog-content]")
    expect(content).toHaveClass(
      "backdrop-blur-[12px]",
      "from-white/[0.07]",
      "to-card/90",
      "border-white/10",
    )
    expect(content?.className).not.toMatch(/(?:^|\s)bg-background(?:\/\S+)?(?:\s|$)/)
  })

  it("skips glass when surface is opaque", () => {
    renderWithLocale(
      <Dialog open>
        <DialogContent surface="opaque">
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Body</DialogDescription>
        </DialogContent>
      </Dialog>,
    )

    const content = document.querySelector("[data-slot=dialog-content]")
    expect(content).toHaveClass("bg-background", "text-foreground", "border-border")
    expect(content).not.toHaveClass("backdrop-blur-[12px]", "to-card/90", "from-white/[0.07]")
  })

  it("uses a frosted background when surface is frost", () => {
    renderWithLocale(
      <Dialog open>
        <DialogContent surface="frost">
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Body</DialogDescription>
        </DialogContent>
      </Dialog>,
    )

    const content = document.querySelector("[data-slot=dialog-content]")
    expect(content).toHaveClass("bg-background/88", "backdrop-blur-[16px]", "text-foreground")
    expect(content).not.toHaveClass("bg-gradient-to-b", "to-card/90")
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
