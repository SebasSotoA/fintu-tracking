import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { CommandDialog, CommandInput, CommandList, CommandItem } from "./command"

const useIsMobileMock = vi.fn()

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => useIsMobileMock(),
}))

function renderCommandDialog({ isMobile = false }: { isMobile?: boolean } = {}) {
  useIsMobileMock.mockReturnValue(isMobile)
  return render(
    <CommandDialog open>
      <CommandInput placeholder="Search..." aria-label="Search commands" />
      <CommandList>
        <CommandItem>Item</CommandItem>
      </CommandList>
    </CommandDialog>,
  )
}

describe("CommandDialog", () => {
  it("renders title, description, and children via dialog on desktop", () => {
    renderCommandDialog({ isMobile: false })

    const dialog = screen.getByRole("dialog")
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveTextContent("Item")
    expect(screen.getByRole("combobox")).toBeInTheDocument()
    expect(document.querySelector("[data-slot='drawer-content']")).not.toBeInTheDocument()
  })

  it("renders as a full-screen drawer on mobile", () => {
    renderCommandDialog({ isMobile: true })

    const dialog = screen.getByRole("dialog")
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveTextContent("Item")
    expect(screen.getByRole("combobox")).toBeInTheDocument()
    expect(document.querySelector("[data-slot='drawer-content']")).toBeInTheDocument()
  })
})
