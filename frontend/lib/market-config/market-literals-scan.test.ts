import { describe, expect, it } from "vitest"
import { readdir, readFile } from "fs/promises"
import path from "path"

const REPO_ROOT = path.resolve(__dirname, "../../..")
const FRONTEND_DIR = path.join(REPO_ROOT, "frontend")

const EXCLUDED_DIRS = ["node_modules", ".next", "out", "dist", "graphify-out"]
const EXCLUDED_FILES = [
  "frontend/lib/market-config/market-config.ts",
  "frontend/lib/market-config/market-config.test.ts",
  "frontend/lib/brokers/broker-presets.ts",
  "frontend/lib/brokers/broker-presets.test.ts",
]

const LITERAL_RE = /\b(USD|COP|Hapi|hapi|Twelve Data|twelve-data|twelveData)\b/g

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.includes(entry.name)) continue
      yield* walk(path.join(dir, entry.name))
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      yield path.join(dir, entry.name)
    }
  }
}

function isImportOrComment(line: string): boolean {
  const trimmed = line.trim()
  return (
    trimmed.startsWith("import ") ||
    trimmed.startsWith("export ") ||
    trimmed.startsWith("}") ||
    trimmed.startsWith("//") ||
    trimmed.includes(" from \"") ||
    trimmed.includes(" from '")
  )
}

describe("market literal scan", () => {
  it("does not find hardcoded market literals in non-exempt frontend source files", async () => {
    const violations: string[] = []

    for await (const filePath of walk(FRONTEND_DIR)) {
      const rel = path.relative(REPO_ROOT, filePath).replace(/\\/g, "/")
      if (EXCLUDED_FILES.includes(rel)) continue
      if (rel.includes(".test.")) continue

      const content = await readFile(filePath, "utf-8")
      const lines = content.split("\n")
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (isImportOrComment(line)) continue
        if (LITERAL_RE.test(line)) {
          violations.push(`${rel}:${i + 1}: ${line.trim()}`)
        }
      }
    }

    expect(violations).toEqual([])
  })
})
