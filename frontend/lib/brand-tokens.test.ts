import { describe, expect, it } from "vitest"
import { readFileSync } from "fs"
import path from "path"

const TOKENS_PATH = path.join(__dirname, "../../packages/brand/tokens.css")
const THEME_PATH = path.join(__dirname, "../../packages/brand/theme.css")
const FONTS_PATH = path.join(__dirname, "../../packages/brand/fonts.css")
const FRONTEND_GLOBALS_PATH = path.join(__dirname, "../app/globals.css")
const FRONTEND_LAYOUT_PATH = path.join(__dirname, "../app/layout.tsx")

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
  it("ships the six-color board, semantic light/dark mapping, and no leftover board hues", () => {
    const css = readFileSync(TOKENS_PATH, "utf-8")
    const root = extractBlock(css, ":root")
    const dark = extractBlock(css, ".dark")

    expect(root).toContain("--spring-green: #05dc80")
    expect(root).toContain("--green: #02674f")
    expect(root).toContain("--dark-green: #16302b")
    expect(root).toContain("--white: #dce4e7")
    expect(root).toContain("--gray: #202020")
    expect(root).toContain("--black: #000000")

    expect(root).toMatch(/(?:^|\n)\s*--background:\s*var\(--white\)/)
    expect(root).toMatch(/(?:^|\n)\s*--primary:\s*var\(--green\)/)
    expect(root).toMatch(/(?:^|\n)\s*--primary-text:\s*var\(--green\)/)
    expect(root).toContain("--radius: 0.4375rem")

    expect(dark).toMatch(/(?:^|\n)\s*--background:\s*var\(--black\)/)
    expect(dark).toMatch(/(?:^|\n)\s*--primary:\s*var\(--spring-green\)/)
    expect(dark).toMatch(/(?:^|\n)\s*--primary-text:\s*var\(--spring-green\)/)
    expect(dark).toMatch(/(?:^|\n)\s*--success:\s*var\(--spring-green\)/)
    expect(dark).toMatch(/(?:^|\n)\s*--success-foreground:\s*var\(--black\)/)
    expect(dark).toMatch(
      /(?:^|\n)\s*--chart-3:\s*color-mix\(in oklch, var\(--dark-green\) 50%, var\(--white\)\)/,
    )
    expect(dark).toMatch(
      /(?:^|\n)\s*--chart-4:\s*color-mix\(in oklch, var\(--gray\) 45%, var\(--white\)\)/,
    )

    expect(css).not.toContain("--landing-glow")
    expect(css).not.toContain("#0B0F17")
    expect(css).not.toContain("#4F46E5")
    expect(css).not.toContain("#6366F1")
    expect(css).not.toContain("277")
  })
})

describe("shared brand theme.css fonts", () => {
  it("names DM Sans as the sans family and does not name Inter", () => {
    const css = readFileSync(THEME_PATH, "utf-8")
    const sansMatch = css.match(/--font-sans:\s*([^;]+);/)
    const sansStack = sansMatch?.[1] ?? ""

    expect(sansStack).toContain('"DM Sans"')
    expect(sansStack).toContain('"DM Sans Variable"')
    expect(css).toContain('"JetBrains Mono"')
    expect(css).not.toContain('"Inter"')
    expect(css).not.toContain("@font-face")
  })
})

describe("shared brand fonts.css", () => {
  it("self-hosts DM Sans and JetBrains Mono and is not loaded via next/font/google", () => {
    const css = readFileSync(FONTS_PATH, "utf-8")
    const layout = readFileSync(FRONTEND_LAYOUT_PATH, "utf-8")

    expect(css).toContain('@import "@fontsource-variable/dm-sans"')
    expect(css).toContain("@fontsource/jetbrains-mono")
    expect(layout).not.toContain("next/font/google")
  })
})

describe("frontend globals.css brand wiring", () => {
  it("imports shared brand tokens and does not assign --primary locally", () => {
    const css = readFileSync(FRONTEND_GLOBALS_PATH, "utf-8")

    expect(css).toContain('@import "@fintu/brand/fonts.css"')
    expect(css).toContain('@import "@fintu/brand/tokens.css"')
    expect(css).toContain('@import "@fintu/brand/theme.css"')
    expect(css).not.toMatch(/(?:^|[^-])--primary:/m)
  })
})
