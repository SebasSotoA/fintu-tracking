import { describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "./responsive-dialog"

describe("ResponsiveDialog", () => {
  it("forwards title, description, header, footer, and children", () => {
    renderWithLocale(
      <ResponsiveDialog open>
        <ResponsiveDialogContent data-testid="responsive-content">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Title</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>Description</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div>Body</div>
          <ResponsiveDialogFooter>
            <button type="button">Action</button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>,
    )

    expect(screen.getByTestId("responsive-content")).toHaveTextContent("Title")
    expect(screen.getByTestId("responsive-content")).toHaveTextContent("Description")
    expect(screen.getByTestId("responsive-content")).toHaveTextContent("Body")
    expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument()
  })

  it("keeps the default overlay dim without blur when overlayClassName is omitted", () => {
    renderWithLocale(
      <ResponsiveDialog open>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Title</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>Description</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
        </ResponsiveDialogContent>
      </ResponsiveDialog>,
    )

    const overlay = document.querySelector("[data-slot=dialog-overlay]")
    expect(overlay).toHaveClass("bg-black/50")
    expect(overlay).not.toHaveClass("backdrop-blur-md")
  })

  it("applies overlayClassName to the overlay while keeping the default dim", () => {
    renderWithLocale(
      <ResponsiveDialog open>
        <ResponsiveDialogContent overlayClassName="backdrop-blur-md custom-intro-overlay">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Title</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>Description</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
        </ResponsiveDialogContent>
      </ResponsiveDialog>,
    )

    const overlay = document.querySelector("[data-slot=dialog-overlay]")
    expect(overlay).toHaveClass("bg-black/50")
    expect(overlay).toHaveClass("backdrop-blur-md")
    expect(overlay).toHaveClass("custom-intro-overlay")
  })
})
