import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import TradesLoading from "./loading"

describe("TradesLoading", () => {
  it("renders TablePageSkeleton as a status region", () => {
    render(<TradesLoading />)

    expect(screen.getByRole("status", { name: "Loading" })).toHaveAttribute(
      "data-testid",
      "table-page-skeleton",
    )
  })

  it("does not use a raw bg-muted pulse placeholder", () => {
    const { container } = render(<TradesLoading />)

    expect(container.querySelector(".bg-muted")).not.toBeInTheDocument()
    expect(document.querySelector(".animate-spin")).not.toBeInTheDocument()
  })
})
