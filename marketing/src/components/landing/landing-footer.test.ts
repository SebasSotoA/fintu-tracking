import { describe, expect, it } from 'vitest'
import { renderAstro } from '@/test/astro-render'
import LandingFooter from '@/components/landing/landing-footer.astro'

const APP_BASE = 'https://app.fintu.com'

describe('LandingFooter', () => {
  it('renders logo, navigation links, and copyright', async () => {
    const { container, getByRole, getByText } = await renderAstro(LandingFooter)

    const logoLink = getByRole('link', { name: 'Fintu' })
    expect(logoLink).toHaveAttribute('href', '/')
    expect(logoLink).toHaveTextContent('Fintu')

    const icon = container.querySelector('img[src*="fintu-aqua-icon"]')
    expect(icon).not.toBeNull()
    expect(icon).toHaveClass('mix-blend-screen')

    expect(getByRole('link', { name: 'Features' })).toHaveAttribute('href', '#features')
    expect(getByRole('link', { name: 'Login' })).toHaveAttribute(
      'href',
      `${APP_BASE}/auth/login`,
    )

    expect(
      getByText(`© ${new Date().getFullYear()} Fintu. All rights reserved.`),
    ).toBeInTheDocument()
  })

  it('uses LATAM-local deposit language instead of country-specific currency', async () => {
    const { getByText, queryByText } = await renderAstro(LandingFooter)

    expect(getByText(/every local deposit converted/i)).toBeInTheDocument()
    expect(queryByText(/colombian peso/i)).toBeNull()
  })
})