import { describe, expect, it } from 'vitest'
import { renderAstro } from '@/test/astro-render'
import LandingNav from '@/components/layout/landing-nav.astro'

const APP_BASE = 'https://app.fintu.com'

describe('LandingNav', () => {
  it('shows login and get started when logged out (nav is always logged-out)', async () => {
    const { getByRole, queryByRole } = await renderAstro(LandingNav)

    expect(getByRole('link', { name: 'Login' })).toHaveAttribute(
      'href',
      `${APP_BASE}/auth/login`,
    )
    expect(getByRole('link', { name: 'Get Started' })).toHaveAttribute(
      'href',
      `${APP_BASE}/auth/sign-up`,
    )
    expect(queryByRole('link', { name: 'Dashboard' })).toBeNull()
  })

  it('uses glass header styling that merges with the hero gradient', async () => {
    const { container } = await renderAstro(LandingNav)
    const header = container.querySelector('header')

    expect(header).not.toBeNull()
    expect(header).toHaveClass('sticky', 'backdrop-blur-md', 'border-border/10')
    expect(header?.className).toMatch(/bg-background\/[1-4]\d/)
    expect(header?.className).not.toMatch(/bg-background\/[6-9]\d/)
  })

  it('shows the small aqua mark with visible Fintu text', async () => {
    const { container, getByRole } = await renderAstro(LandingNav)

    const logoLink = getByRole('link', { name: 'Fintu' })
    expect(logoLink).toHaveAttribute('href', '/')
    expect(logoLink).toHaveTextContent('Fintu')

    const icon = container.querySelector('img[src*="fintu-aqua-icon"]')
    expect(icon).not.toBeNull()
    expect(icon).toHaveClass('mix-blend-screen')
  })
})
