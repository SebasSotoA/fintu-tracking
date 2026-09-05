import { describe, expect, it } from "vitest"
import { readFileSync } from "fs"
import path from "path"

const AURORA_SOURCE_PATH = path.join(__dirname, "aurora.tsx")

describe("Aurora defaults", () => {
  it("ships Fintu indigo stops so an unpropped Aurora cannot render React Bits purple/green", () => {
    const source = readFileSync(AURORA_SOURCE_PATH, "utf-8")

    expect(source).toContain('["#4338CA", "#6366F1", "#4F46E5"]')
    expect(source).not.toContain("#5227FF")
    expect(source).not.toContain("#7cff67")
    expect(source).not.toContain("#475569")
    expect(source).not.toContain("#64748b")
  })
})
