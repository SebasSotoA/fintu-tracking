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
})
