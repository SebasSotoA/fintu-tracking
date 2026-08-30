import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog"

describe("Dialog", () => {
  it("keeps 1.5rem bottom padding and does not use pb-safe", () => {
    render(
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
})
