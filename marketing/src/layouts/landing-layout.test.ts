import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const layoutPath = join(dirname(fileURLToPath(import.meta.url)), 'landing-layout.astro')

describe('LandingLayout fonts', () => {
  it('loads DM Sans and JetBrains Mono and does not reference Inter or Geist Mono', () => {
    const source = readFileSync(layoutPath, 'utf-8')

    expect(source).toContain('@fontsource-variable/dm-sans')
    expect(source).toMatch(/jetbrains-mono/i)
    expect(source).not.toMatch(/@fontsource\/inter/i)
    expect(source).not.toMatch(/geist-mono/i)
  })
})
