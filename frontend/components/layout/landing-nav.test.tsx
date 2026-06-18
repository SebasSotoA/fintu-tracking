import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { LandingNav } from "./landing-nav"

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}))

const mockGetUser = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}))

describe("LandingNav", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows login and get started when logged out", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    render(await LandingNav())

    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/auth/login")
    expect(screen.getByRole("link", { name: "Get Started" })).toHaveAttribute(
      "href",
      "/auth/sign-up",
    )
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument()
  })

  it("shows dashboard when logged in", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "investor@example.com" } },
    })

    render(await LandingNav())

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard")
    expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Get Started" })).not.toBeInTheDocument()
  })
})
