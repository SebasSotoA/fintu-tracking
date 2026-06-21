import "@testing-library/jest-dom"
import { vi } from "vitest"

vi.mock("@/lib/fonts/landing-display", () => ({
  landingDisplay: {
    className: "font-landing-display",
    variable: "--font-landing-display",
  },
}))
