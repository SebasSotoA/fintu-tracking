import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const layoutPath = join(dirname(fileURLToPath(import.meta.url)), 'landing-layout.astro')
const globalsPath = join(dirname(fileURLToPath(import.meta.url)), '../styles/globals.css')

describe('LandingLayout fonts', () => {
  it('loads fonts from brand fonts.css and does not import fontsource in the layout', () => {
    const source = readFileSync(layoutPath, 'utf-8')
    const globals = readFileSync(globalsPath, 'utf-8')

    expect(globals).toContain('@import "@fintu/brand/fonts.css"')
    expect(source).not.toContain('@fontsource-variable/dm-sans')
    expect(source).not.toMatch(/@fontsource\/jetbrains-mono/i)
    expect(source).not.toMatch(/@fontsource\/inter/i)
    expect(source).not.toMatch(/geist-mono/i)
  })
})
