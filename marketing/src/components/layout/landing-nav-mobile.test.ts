import { describe, expect, it } from 'vitest'
import { renderAstro } from '@/test/astro-render'
import LandingNavMobile from '@/components/layout/landing-nav-mobile.astro'

const APP_BASE = 'https://app.fintu.com'

describe('LandingNavMobile', () => {
  it('uses glass styling on the mobile menu panel', async () => {
    const { document } = await renderAstro(LandingNavMobile)

    const menu = document.getElementById('landing-mobile-menu')
    expect(menu).not.toBeNull()
    expect(menu).toHaveClass('backdrop-blur-md', 'border-border/10')
    expect(menu?.className).toMatch(/bg-background\/[1-4]\d/)
    expect(menu?.className).not.toMatch(/bg-background\/[6-9]\d/)
  })

  it('renders an initial closed menu with anchor links inside', async () => {
    const { document, container } = await renderAstro(LandingNavMobile)

    const menu = document.getElementById('landing-mobile-menu')
    expect(menu).toHaveClass('motion-reduce:transition-none')
    expect(menu).toHaveAttribute('aria-hidden', 'true')
    expect(menu?.hasAttribute('inert')).toBe(true)

    // The menu is `inert` on initial render, which removes its subtree from the
    // accessibility tree — query by selector instead of by role.
    const featuresLink = container.querySelector<HTMLAnchorElement>(
      'a[href="#features"]',
    )
    expect(featuresLink).not.toBeNull()
    expect(featuresLink?.textContent?.trim()).toBe('Features')
  })

  it('shows login and get started when logged out', async () => {
    const { container } = await renderAstro(LandingNavMobile)

    const loginLink = container.querySelector<HTMLAnchorElement>(
      `a[href="${APP_BASE}/auth/login"]`,
    )
    expect(loginLink).not.toBeNull()
    expect(loginLink?.textContent?.trim()).toBe('Login')

    const signUpLink = container.querySelector<HTMLAnchorElement>(
      `a[href="${APP_BASE}/auth/sign-up"]`,
    )
    expect(signUpLink).not.toBeNull()
    expect(signUpLink?.textContent?.trim()).toBe('Get Started')

    const dashboardLink = container.querySelector<HTMLAnchorElement>(
      `a[href="${APP_BASE}/dashboard"]`,
    )
    expect(dashboardLink).toBeNull()
  })

  it('renders a toggle button labelled to open the menu', async () => {
    const { getByRole } = await renderAstro(LandingNavMobile)

    const toggle = getByRole('button', { name: 'Open menu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-controls', 'landing-mobile-menu')
  })
})