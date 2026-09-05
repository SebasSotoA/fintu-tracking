import { describe, expect, it } from "vitest"
import { readFileSync } from "fs"
import path from "path"

const TOKENS_PATH = path.join(__dirname, "../../../packages/brand/tokens.css")
const AUTH_SHELL_PATH = path.join(__dirname, "auth-shell.css")

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

function customPropertyAssignments(block: string): Array<{ name: string; value: string }> {
  return [...block.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].map((match) => ({
    name: match[1],
    value: match[2].replace(/\s+/g, " ").trim(),
  }))
}

describe("auth-shell.css", () => {
  it("paints .auth-shell black without using bg-primary", () => {
    const css = readFileSync(AUTH_SHELL_PATH, "utf-8")
    const shell = extractBlock(css, ".auth-shell")

    expect(shell).toMatch(/#000000|var\(--black\)/)
    expect(css).not.toContain("bg-primary")
  })

  it("redeclares every light :root token on .auth-light", () => {
    const tokens = readFileSync(TOKENS_PATH, "utf-8")
    const css = readFileSync(AUTH_SHELL_PATH, "utf-8")
    const root = extractBlock(tokens, ":root")
    const authLight = extractBlock(css, ".auth-light")
    const authAssignments = new Map(
      customPropertyAssignments(authLight).map((assignment) => [assignment.name, assignment.value]),
    )

    expect(authLight).toContain("color-scheme: light")
    expect(authLight).toContain("color: var(--foreground)")
    for (const { name, value } of customPropertyAssignments(root)) {
      expect(authAssignments.get(name), `missing or mismatched ${name}`).toBe(value)
    }
  })

  it("resets auth inputs so html.dark cannot leak dark:bg-input", () => {
    const css = readFileSync(AUTH_SHELL_PATH, "utf-8")
    expect(css).toContain('.auth-light [data-slot="input"]')
    expect(css).toContain("background-color: var(--background)")
  })
})
