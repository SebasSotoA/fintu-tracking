import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MoneyHeroInput } from "./money-hero-input"

describe("MoneyHeroInput", () => {
  it("renders label, dollar prefix, and input in a compact bordered group", () => {
    render(
      <MoneyHeroInput
        id="amount"
        label="Deposit amount"
        value="100"
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByText("Deposit amount")).toBeInTheDocument()
    expect(screen.getByText("$")).toHaveClass("text-base", "font-mono")
    expect(screen.getByText("$")).not.toHaveClass("text-3xl")

    const input = screen.getByLabelText("Deposit amount")
    expect(input).toHaveClass("text-base", "font-mono")
    expect(input).not.toHaveClass("text-3xl")
    expect(input).not.toHaveClass("h-16")

    const borderWrapper = input.closest(".border")
    expect(borderWrapper).toBeTruthy()
    expect(borderWrapper).toContainElement(screen.getByText("$"))
  })

  it("wrapper has h-11, md:h-9, and items-center (matches shadcn Input heights)", () => {
    render(
      <MoneyHeroInput
        id="amount"
        label="Deposit amount"
        value="100"
        onChange={vi.fn()}
      />,
    )

    const input = screen.getByLabelText("Deposit amount")
    const borderWrapper = input.closest(".border") as HTMLElement
    expect(borderWrapper).toHaveClass("h-11")
    expect(borderWrapper).toHaveClass("md:h-9")
    expect(borderWrapper).toHaveClass("items-center")
  })

  it("$ prefix has h-full, items-center, and leading-none — not h-16", () => {
    render(
      <MoneyHeroInput
        id="amount"
        label="Deposit amount"
        value="100"
        onChange={vi.fn()}
      />,
    )

    const dollar = screen.getByText("$")
    expect(dollar).toHaveClass("h-full")
    expect(dollar).toHaveClass("items-center")
    expect(dollar).toHaveClass("leading-none")
    expect(dollar).toHaveClass("shrink-0", "pl-4", "pr-1")
    expect(dollar).not.toHaveClass("h-16")
    expect(dollar).not.toHaveClass("pl-3")
  })

  it("input has h-full, md:h-full, leading-none, py-0 — not h-16 or text-3xl", () => {
    render(
      <MoneyHeroInput
        id="amount"
        label="Deposit amount"
        value="100"
        onChange={vi.fn()}
      />,
    )

    const input = screen.getByLabelText("Deposit amount")
    expect(input).toHaveClass("h-full")
    expect(input).toHaveClass("md:h-full")
    expect(input).toHaveClass("leading-none")
    expect(input).toHaveClass("py-0")
    expect(input).toHaveClass("pl-1.5", "pr-3")
    expect(input).not.toHaveClass("h-16")
    expect(input).not.toHaveClass("text-3xl")
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

  it("does not render a help button without help props", () => {
    render(
      <MoneyHeroInput
        id="amount"
        label="Deposit amount"
        value="100"
        onChange={vi.fn()}
      />,
    )

    expect(screen.queryByRole("button", { name: /about deposit amount/i })).not.toBeInTheDocument()
  })

  it("renders a CircleHelp tooltip next to the label when help is provided", async () => {
    const user = userEvent.setup()
    render(
      <MoneyHeroInput
        id="amount"
        label="Deposit amount"
        value="100"
        onChange={vi.fn()}
        help="This field is the USD credited at the broker. COP is not typed; COP = (USD + fee) × FX."
        helpLabel="About deposit amount"
      />,
    )

    const helpButton = screen.getByRole("button", { name: /about deposit amount/i })
    expect(helpButton).toBeInTheDocument()

    await user.hover(helpButton)
    const tooltip = await screen.findByRole("tooltip")
    expect(tooltip).toHaveTextContent(
      "This field is the USD credited at the broker. COP is not typed; COP = (USD + fee) × FX.",
    )
  })

  it("shows the help tooltip on keyboard focus", async () => {
    const user = userEvent.setup()
    render(
      <MoneyHeroInput
        id="amount"
        label="Deposit amount"
        value="100"
        onChange={vi.fn()}
        help="This field is the USD credited at the broker. COP is not typed; COP = (USD + fee) × FX."
        helpLabel="About deposit amount"
      />,
    )

    await user.tab()
    expect(screen.getByRole("button", { name: /about deposit amount/i })).toHaveFocus()
    expect(await screen.findByRole("tooltip")).toHaveTextContent(/USD credited at the broker/i)
  })
})
