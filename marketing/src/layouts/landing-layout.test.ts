import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const layoutPath = join(dirname(fileURLToPath(import.meta.url)), 'landing-layout.astro')

describe('LandingLayout fonts', () => {
  it('loads JetBrains Mono and does not reference Geist Mono', () => {
    const source = readFileSync(layoutPath, 'utf-8')

    expect(source).toMatch(/jetbrains-mono/i)
    expect(source).not.toMatch(/geist-mono/i)
  })
})
