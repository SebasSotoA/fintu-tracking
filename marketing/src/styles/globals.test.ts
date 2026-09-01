import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const globalsPath = join(dirname(fileURLToPath(import.meta.url)), 'globals.css')

describe('marketing globals.css brand wiring', () => {
  it('imports shared brand tokens and keeps landing glow locally', () => {
    const css = readFileSync(globalsPath, 'utf-8')

    expect(css).toContain('@import "@fintu/brand/tokens.css"')
    expect(css).toContain('@import "@fintu/brand/theme.css"')
    expect(css).toContain('--landing-glow-mint')
    expect(css).not.toMatch(/(?:^|[^-])--primary:/m)
  })
})
