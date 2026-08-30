import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "./alert-dialog"

describe("AlertDialog", () => {
  it("keeps 1.5rem bottom padding and does not use pb-safe", () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>Confirm</AlertDialogTitle>
          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          <AlertDialogFooter>
            <button type="button">Cancel</button>
            <button type="button">Delete</button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    )

    const content = document.querySelector("[data-slot=alert-dialog-content]")
    expect(content).toHaveClass("pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]")
    expect(content).not.toHaveClass("pb-safe")
  })
})
