import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MoneyHeroInput } from "./money-hero-input"

describe("MoneyHeroInput", () => {
  it("renders label, dollar prefix, and hero-styled input in a bordered group", () => {
    render(
      <MoneyHeroInput
        id="amount"
        label="Deposit amount"
        value="100"
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByText("Deposit amount")).toBeInTheDocument()
    expect(screen.getByText("$")).toHaveClass("text-3xl", "font-bold", "font-mono")

    const input = screen.getByLabelText("Deposit amount")
    expect(input).toHaveClass("h-16", "text-3xl", "font-bold", "font-mono")

    const borderWrapper = input.closest(".border")
    expect(borderWrapper).toBeTruthy()
    expect(borderWrapper).toContainElement(screen.getByText("$"))
  })

  it("calls onChange when user types", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <MoneyHeroInput
        id="amount"
        label="Deposit amount"
        value=""
        onChange={onChange}
      />,
    )

    await user.type(screen.getByLabelText("Deposit amount"), "50")
    expect(onChange).toHaveBeenCalled()
  })
})
