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

function declaredCustomProperties(block: string): string[] {
  return [...block.matchAll(/--[a-z0-9-]+(?=:)/g)].map((match) => match[0])
}

describe("auth-shell.css", () => {
  it("paints .auth-shell navy without using bg-primary", () => {
    const css = readFileSync(AUTH_SHELL_PATH, "utf-8")
    const shell = extractBlock(css, ".auth-shell")

    expect(shell).toContain("#0B0F17")
    expect(css).not.toContain("bg-primary")
  })

  it("redeclares every light :root token on .auth-light", () => {
    const tokens = readFileSync(TOKENS_PATH, "utf-8")
    const css = readFileSync(AUTH_SHELL_PATH, "utf-8")
    const root = extractBlock(tokens, ":root")
    const authLight = extractBlock(css, ".auth-light")

    expect(authLight).toContain("color-scheme: light")
    expect(authLight).toContain("color: var(--foreground)")
    for (const name of declaredCustomProperties(root)) {
      expect(authLight, `missing ${name}`).toContain(`${name}:`)
    }
  })

  it("resets auth inputs so html.dark cannot leak dark:bg-input", () => {
    const css = readFileSync(AUTH_SHELL_PATH, "utf-8")
    expect(css).toContain('.auth-light [data-slot="input"]')
    expect(css).toContain("background-color: var(--background)")
  })
})
