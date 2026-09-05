import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import nextConfig from "./next.config.mjs"

const frontendDir = path.dirname(fileURLToPath(import.meta.url))

describe("next.config", () => {
  it("pins turbopack root to the frontend package so HMR can resolve next", () => {
    expect(nextConfig.turbopack?.root).toBe(frontendDir)
  })

  it("keeps static export and unoptimized images", () => {
    expect(nextConfig.output).toBe("export")
    expect(nextConfig.images?.unoptimized).toBe(true)
  })
})
