import { describe, expect, it } from 'vitest'
import { renderAstro } from '@/test/astro-render'
import LandingAtmosphere from '@/components/landing/landing-atmosphere.astro'

describe('LandingAtmosphere', () => {
  it('renders children without nested vertical scroll container', async () => {
    const { container, within } = await renderAstro(LandingAtmosphere, {
      slots: { default: '<p>Landing content</p>' },
    })

    const root = container.firstElementChild as HTMLElement | null
    expect(root).toBeTruthy()
    expect(root).toHaveClass('min-h-dvh')
    expect(root).not.toHaveClass('overflow-x-hidden')
    expect(within.queryByText('Landing content')).not.toBeNull()
  })

  it('uses modest blob opacities for ambient mint atmosphere', async () => {
    const { baseElement } = await renderAstro(LandingAtmosphere, {
      slots: { default: '<span>Main</span>' },
    })

    const mainGlow = baseElement.querySelector(
      '[data-landing-decoration] .landing-glow',
    ) as HTMLElement | null
    const softGlow = baseElement.querySelector(
      '[data-landing-decoration] .landing-glow-reverse',
    ) as HTMLElement | null

    expect(mainGlow).not.toBeNull()
    expect(softGlow).not.toBeNull()
    expect(mainGlow).toHaveClass('opacity-75')
    expect(softGlow).toHaveClass('opacity-50')
    expect(mainGlow).not.toHaveClass('opacity-80')
    expect(softGlow).not.toHaveClass('opacity-55')
  })

  it('derives atmosphere glows from mint landing tokens tied to primary', async () => {
    const { baseElement } = await renderAstro(LandingAtmosphere, {
      slots: { default: '<span>Main</span>' },
    })

    const glowElements = Array.from(
      baseElement.querySelectorAll(
        '[data-landing-decoration] .landing-glow, [data-landing-decoration] .landing-glow-reverse',
      ),
    ) as HTMLElement[]
    const glowStyles = glowElements.map((element) => element.getAttribute('style') ?? '')

    expect(glowStyles.length).toBeGreaterThanOrEqual(2)
    expect(glowStyles[0]).toContain('var(--landing-glow-mint)')
    expect(glowStyles[1]).toContain('var(--landing-glow-soft)')
    expect(glowStyles.some((style) => style.includes('primary-container'))).toBe(false)
    expect(glowStyles.some((style) => style.includes('color-mix'))).toBe(false)
  })

  it('keeps decorative layers in a fixed clip container', async () => {
    const { baseElement } = await renderAstro(LandingAtmosphere, {
      slots: { default: '<span>Main</span>' },
    })

    const decorationLayer = baseElement.querySelector('[data-landing-decoration]')
    expect(decorationLayer).toBeTruthy()
    expect(decorationLayer).toHaveClass(
      'fixed',
      'inset-0',
      'overflow-hidden',
      'pointer-events-none',
    )
  })
})