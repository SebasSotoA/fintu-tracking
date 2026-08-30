import { useState } from "react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SettingsShell } from "./settings-shell"
import type { SettingsCategoryDef, SettingsCategoryId } from "./settings-catalog"

const useIsMobileMock = vi.fn()

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => useIsMobileMock(),
}))

const categories: Pick<SettingsCategoryDef, "id" | "label" | "icon">[] = [
  { id: "general", label: "General", icon: "settings" },
  { id: "account", label: "Account", icon: "user" },
]

function ShellHarness({
  activeId,
  onCategoryChange,
  onQueryChange,
}: {
  activeId: SettingsCategoryId
  onCategoryChange: (id: SettingsCategoryId) => void
  onQueryChange: (query: string) => void
}) {
  const [query, setQuery] = useState("")
  return (
    <SettingsShell
      header={<h2>Settings</h2>}
      categories={categories}
      activeId={activeId}
      onCategoryChange={onCategoryChange}
      query={query}
      onQueryChange={(next) => {
        setQuery(next)
        onQueryChange(next)
      }}
    >
      <p>Pane content</p>
    </SettingsShell>
  )
}

function renderShell({
  isMobile = false,
  activeId = "general" as const,
}: {
  isMobile?: boolean
  activeId?: "general" | "account"
} = {}) {
  useIsMobileMock.mockReturnValue(isMobile)
  const onCategoryChange = vi.fn()
  const onQueryChange = vi.fn()
  return {
    onCategoryChange,
    onQueryChange,
    ...render(
      <ShellHarness
        activeId={activeId}
        onCategoryChange={onCategoryChange}
        onQueryChange={onQueryChange}
      />,
    ),
  }
}

describe("SettingsShell", () => {
  beforeEach(() => {
    useIsMobileMock.mockReset()
  })

  it("fires onCategoryChange when Account is clicked", async () => {
    const user = userEvent.setup()
    const { onCategoryChange } = renderShell()

    await user.click(screen.getByRole("button", { name: "Account" }))

    expect(onCategoryChange).toHaveBeenCalledWith("account")
  })

  it("calls onQueryChange when the search input changes", async () => {
    const user = userEvent.setup()
    const { onQueryChange } = renderShell()

    await user.type(screen.getByRole("searchbox", { name: "Search settings" }), "theme")

    expect(onQueryChange.mock.calls.at(-1)?.[0]).toBe("theme")
  })

  it("shows the desktop rail", () => {
    renderShell({ isMobile: false })

    expect(screen.getByTestId("settings-rail")).toBeInTheDocument()
    expect(screen.getByTestId("settings-rail")).toHaveClass("w-56")
    expect(screen.queryByTestId("settings-nav-chips")).not.toBeInTheDocument()
  })

  it("shows mobile chips and no rail", () => {
    renderShell({ isMobile: true })

    expect(screen.getByTestId("settings-nav-chips")).toBeInTheDocument()
    expect(screen.queryByTestId("settings-rail")).not.toBeInTheDocument()
  })

  it("renders the header slot and a scrollable content pane", () => {
    renderShell()

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument()
    const pane = screen.getByTestId("settings-content")
    expect(pane).toHaveClass("overflow-y-auto")
    expect(pane).toHaveTextContent("Pane content")
  })

  it("positions the header relatively so the drawer close sits in the title row", () => {
    renderShell()

    expect(screen.getByRole("heading", { name: "Settings" }).parentElement).toHaveClass("relative")
  })
})
