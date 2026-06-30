import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MobileActions } from "./mobile-actions"

const EditIcon = () => <span data-testid="edit-icon">EditIcon</span>
const DeleteIcon = () => <span data-testid="delete-icon">DelIcon</span>

describe("MobileActions", () => {
  it("renders actions with accessible labels", () => {
    render(
      <MobileActions
        actions={[
          { label: "Edit", onClick: () => {}, icon: EditIcon },
          { label: "Delete", onClick: () => {}, icon: DeleteIcon, destructive: true },
        ]}
      />,
    )

    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument()
  })

  it("uses a minimum 44px tap target on mobile", () => {
    render(
      <MobileActions
        actions={[{ label: "Edit", onClick: () => {}, icon: EditIcon }]}
      />,
    )

    const button = screen.getByRole("button", { name: "Edit" })
    expect(button).toHaveClass("min-h-11", "min-w-11")
  })

  it("shrinks to a smaller icon-only hit area on desktop", () => {
    render(
      <MobileActions
        actions={[{ label: "Edit", onClick: () => {}, icon: EditIcon }]}
      />,
    )

    const button = screen.getByRole("button", { name: "Edit" })
    expect(button).toHaveClass("md:min-h-9", "md:min-w-9")
  })

  it("applies destructive styling to destructive actions", () => {
    render(
      <MobileActions
        actions={[{ label: "Delete", onClick: () => {}, icon: DeleteIcon, destructive: true }]}
      />,
    )

    const button = screen.getByRole("button", { name: "Delete" })
    expect(button).toHaveClass("text-destructive")
  })
})
