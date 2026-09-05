export interface DevOnboardingPreview {
  setup: boolean
  intro: boolean
}

export function parseDevOnboardingPreview(
  search: string,
  nodeEnv: string = process.env.NODE_ENV ?? "",
): DevOnboardingPreview {
  if (nodeEnv !== "development") {
    return { setup: false, intro: false }
  }

  const query = search.startsWith("?") ? search.slice(1) : search
  const params = new URLSearchParams(query)
  const all = params.get("devOnboarding") === "1"

  return {
    setup: all || params.get("devSetup") === "1",
    intro: all || params.get("devIntro") === "1",
  }
}
