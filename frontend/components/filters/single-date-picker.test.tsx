import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SingleDatePicker } from "./single-date-picker"

vi.mock("@/components/ui/calendar", () => ({
  Calendar: ({
    onSelect,
  }: {
    onSelect?: (date: Date) => void
  }) => (
    <button type="button" data-testid="calendar-pick" onClick={() => onSelect?.(new Date(2024, 5, 15))}>
      Pick
    </button>
  ),
}))

describe("SingleDatePicker", () => {
  it("applies selected calendar day on Apply", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <SingleDatePicker
        id="trade-date"
        label="Date"
        ariaLabel="Trade date"
        value=""
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Trade date" }))
    await user.click(screen.getByTestId("calendar-pick"))
    await user.click(screen.getByRole("button", { name: "Apply" }))

    expect(onChange).toHaveBeenCalledWith("2024-06-15")
  })
})
