import { describe, expect, it } from "vitest"
import { readFileSync } from "fs"
import path from "path"

const AURORA_SOURCE_PATH = path.join(__dirname, "aurora.tsx")

describe("Aurora defaults", () => {
  it("ships Fintu green stops so an unpropped Aurora cannot render React Bits purple/green", () => {
    const source = readFileSync(AURORA_SOURCE_PATH, "utf-8")

    expect(source).toContain('["#05dc80", "#02674f", "#16302b"]')
    expect(source).not.toContain("#5227FF")
    expect(source).not.toContain("#7cff67")
    expect(source).not.toContain("#475569")
    expect(source).not.toContain("#64748b")
  })
})
