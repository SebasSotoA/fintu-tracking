import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
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
    render(
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
