import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { NotesTextarea } from "./notes-textarea"

describe("NotesTextarea", () => {
  it("uses fixed height and minimal scrollbar classes", () => {
    render(<NotesTextarea aria-label="Notes" />)
    const el = screen.getByLabelText("Notes")
    expect(el).toHaveClass("h-24")
    expect(el).toHaveClass("resize-none")
    expect(el).toHaveClass("scrollbar-minimal")
    expect(el).toHaveClass("overflow-y-auto")
  })
})
