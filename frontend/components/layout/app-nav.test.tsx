import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { AppNav } from "./app-nav"
import type { Profile } from "@/lib/api/me"

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}))

vi.mock("@/hooks/use-sign-out", () => ({
  useSignOut: () => vi.fn(),
}))

vi.mock("@/components/profile/profile-config-dialog", () => ({
  ProfileConfigDialog: () => null,
}))

const baseProfile: Profile = {
  id: "profile-1",
  user_id: "user-1",
  country: "co",
  broker_preset_id: "hapi-colombia",
  onboarding_completed: true,
  onboarding_step: "done",
  created_at: "",
  updated_at: "",
}

describe("AppNav", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows My account and Portfolio labels in English on desktop sidebar", () => {
    render(
      <AppNav collapsed={false} onToggleCollapsed={vi.fn()} profile={baseProfile} />,
    )

    const sidebar = screen.getByTestId("app-sidebar")
    expect(within(sidebar).getByText("My account")).toBeInTheDocument()
    expect(within(sidebar).getByText("Portfolio")).toBeInTheDocument()
  })

  it("places My account at the bottom of the desktop sidebar", () => {
    render(
      <AppNav collapsed={false} onToggleCollapsed={vi.fn()} profile={baseProfile} />,
    )

    const sidebar = screen.getByTestId("app-sidebar")
    const children = Array.from(sidebar.children)
    const lastChild = children[children.length - 1]

    expect(within(lastChild as HTMLElement).getByText("My account")).toBeInTheDocument()
  })

  it("does not render standalone Sign Out in desktop sidebar", () => {
    render(
      <AppNav collapsed={false} onToggleCollapsed={vi.fn()} profile={baseProfile} />,
    )

    const sidebar = screen.getByTestId("app-sidebar")
    expect(within(sidebar).queryByRole("button", { name: "Sign Out" })).not.toBeInTheDocument()
    expect(within(sidebar).queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument()
  })

  it("shows Account label in English on mobile bottom nav", () => {
    render(
      <AppNav collapsed={false} onToggleCollapsed={vi.fn()} profile={baseProfile} />,
    )

    expect(screen.getByTestId("my-account-button-mobile")).toHaveTextContent("Account")
  })

  it("does not render Sign out in mobile bottom nav", () => {
    render(
      <AppNav collapsed={false} onToggleCollapsed={vi.fn()} profile={baseProfile} />,
    )

    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument()
  })

  it("uses duration-200 ease-in-out for sidebar width transition", () => {
    render(
      <AppNav collapsed={false} onToggleCollapsed={vi.fn()} profile={baseProfile} />,
    )

    const sidebar = screen.getByTestId("app-sidebar")
    expect(sidebar.className).toContain("duration-200")
    expect(sidebar.className).toContain("ease-in-out")
  })
})
