import { describe, expect, it } from "vitest"
import { parseDevOnboardingPreview } from "./onboarding-preview"

describe("parseDevOnboardingPreview", () => {
  it("ignores query flags outside development", () => {
    expect(parseDevOnboardingPreview("?devOnboarding=1", "production")).toEqual({
      setup: false,
      intro: false,
    })
    expect(parseDevOnboardingPreview("?devSetup=1&devIntro=1", "test")).toEqual({
      setup: false,
      intro: false,
    })
  })

  it("enables setup then intro for devOnboarding=1", () => {
    expect(parseDevOnboardingPreview("?devOnboarding=1", "development")).toEqual({
      setup: true,
      intro: true,
    })
  })

  it("enables only setup or only intro", () => {
    expect(parseDevOnboardingPreview("devSetup=1", "development")).toEqual({
      setup: true,
      intro: false,
    })
    expect(parseDevOnboardingPreview("?devIntro=1", "development")).toEqual({
      setup: false,
      intro: true,
    })
  })
})
