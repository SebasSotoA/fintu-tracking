import { useState } from "react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SettingsNav } from "./settings-nav"
import type { SettingsCategoryDef, SettingsCategoryId } from "./settings-catalog"
import { renderWithLocale } from "@/lib/i18n/test-utils"

const useIsMobileMock = vi.fn()

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => useIsMobileMock(),
}))

const categories: Pick<SettingsCategoryDef, "id" | "label" | "icon">[] = [
  { id: "general", label: "General", icon: "settings" },
  { id: "account", label: "Account", icon: "user" },
]

function NavHarness({
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
    <SettingsNav
      categories={categories}
      activeId={activeId}
      onCategoryChange={onCategoryChange}
      query={query}
      onQueryChange={(next) => {
        setQuery(next)
        onQueryChange(next)
      }}
    />
  )
}

function renderNav({
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
    ...renderWithLocale(
      <NavHarness
        activeId={activeId}
        onCategoryChange={onCategoryChange}
        onQueryChange={onQueryChange}
      />,
    ),
  }
}

describe("SettingsNav", () => {
  beforeEach(() => {
    useIsMobileMock.mockReset()
  })

  it("renders a search field labeled Search settings", () => {
    renderNav()

    const search = screen.getByRole("searchbox", { name: "Search settings" })
    expect(search).toHaveAttribute("placeholder", "Search settings")
  })

  it("marks the active category with aria-current=page", () => {
    renderNav({ activeId: "general" })

    expect(screen.getByRole("button", { name: "General" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("button", { name: "Account" })).not.toHaveAttribute("aria-current")
  })

  it("calls onCategoryChange when Account is clicked", async () => {
    const user = userEvent.setup()
    const { onCategoryChange } = renderNav()

    await user.click(screen.getByRole("button", { name: "Account" }))

    expect(onCategoryChange).toHaveBeenCalledWith("account")
  })

  it("calls onQueryChange when typing in search", async () => {
    const user = userEvent.setup()
    const { onQueryChange } = renderNav()

    await user.type(screen.getByRole("searchbox", { name: "Search settings" }), "broker")

    expect(onQueryChange).toHaveBeenCalled()
    expect(onQueryChange.mock.calls.at(-1)?.[0]).toBe("broker")
  })

  it("shows the vertical rail on desktop", () => {
    renderNav({ isMobile: false })

    expect(screen.getByTestId("settings-nav-rail")).toBeInTheDocument()
    expect(screen.queryByTestId("settings-nav-chips")).not.toBeInTheDocument()
  })

  it("shows horizontal chips on mobile", () => {
    renderNav({ isMobile: true })

    expect(screen.getByTestId("settings-nav-chips")).toBeInTheDocument()
    expect(screen.queryByTestId("settings-nav-rail")).not.toBeInTheDocument()
  })

  it("renders an indigo pip on the active item", () => {
    renderNav({ activeId: "account" })

    const pip = screen.getByTestId("settings-nav-pip")
    expect(pip).toHaveClass("bg-primary")
    expect(screen.getByRole("button", { name: "Account" })).toContainElement(pip)
  })

  it("uses min-h-11 touch targets on mobile chips and h-9 on the desktop rail", () => {
    const { unmount } = renderNav({ isMobile: true, activeId: "general" })
    expect(screen.getByRole("button", { name: "General" })).toHaveClass("min-h-11")
    unmount()

    renderNav({ isMobile: false, activeId: "general" })
    expect(screen.getByRole("button", { name: "General" })).toHaveClass("h-9")
    expect(screen.getByRole("button", { name: "General" })).not.toHaveClass("min-h-11")
    expect(screen.getByRole("button", { name: "General" })).toHaveClass("rounded-md")
    expect(screen.getByRole("button", { name: "General" })).not.toHaveClass("rounded-full")
  })

  it("uses sidebar pressed contrast on the active General button", () => {
    renderNav({ activeId: "general" })

    const general = screen.getByRole("button", { name: "General" })
    expect(general.className).toContain("bg-primary/10")
    expect(general.className).toContain("text-foreground")
    expect(general.className).not.toMatch(/(?:^|\s)bg-muted(?:\s|$)/)
  })
})
