import { describe, expect, it } from "vitest"
import { readFileSync } from "fs"
import path from "path"

const TOKENS_PATH = path.join(__dirname, "../../packages/brand/tokens.css")
const FRONTEND_GLOBALS_PATH = path.join(__dirname, "../app/globals.css")

function extractBlock(css: string, selector: string): string {
  const marker = `${selector} {`
  const start = css.indexOf(marker)
  if (start === -1) {
    return ""
  }
  const open = css.indexOf("{", start)
  let depth = 0
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++
    else if (css[i] === "}") {
      depth--
      if (depth === 0) {
        return css.slice(open + 1, i)
      }
    }
  }
  return ""
}

describe("shared brand tokens.css", () => {
  it("ships dashboard dark primary, primary-text, and radius without landing glows", () => {
    const css = readFileSync(TOKENS_PATH, "utf-8")
    const root = extractBlock(css, ":root")
    const dark = extractBlock(css, ".dark")

    expect(dark).toContain("--primary: oklch(0.51 0.21 277)")
    expect(root).toContain("--primary-text: oklch(0.40 0.14 277)")
    expect(dark).toContain("--primary-text: oklch(0.82 0.12 277)")
    expect(root).toContain("--radius: 0.4375rem")
    expect(css).not.toContain("--landing-glow")
  })
})

describe("frontend globals.css brand wiring", () => {
  it("imports shared brand tokens and does not assign --primary locally", () => {
    const css = readFileSync(FRONTEND_GLOBALS_PATH, "utf-8")

    expect(css).toContain('@import "@fintu/brand/tokens.css"')
    expect(css).toContain('@import "@fintu/brand/theme.css"')
    expect(css).not.toMatch(/(?:^|[^-])--primary:/m)
  })
})
