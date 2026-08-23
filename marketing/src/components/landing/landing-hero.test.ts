import { describe, expect, it } from 'vitest'
import { renderAstro } from '@/test/astro-render'
import LandingHero from '@/components/landing/landing-hero.astro'

const APP_BASE = 'https://app.fintu.com'

describe('LandingHero', () => {
  it('renders headline and subcopy', async () => {
    const { queryByText } = await renderAstro(LandingHero)

    expect(queryByText(/built for latam retail investors/i)).not.toBeNull()
    expect(queryByText(/us assets through your local broker/i)).not.toBeNull()
    expect(queryByText(/tracked with precision/i)).not.toBeNull()
    expect(
      queryByText(/local-currency.*fx.*broker fees.*cost basis/i),
    ).not.toBeNull()
  })

  it('does not expose an about section anchor', async () => {
    const { baseElement } = await renderAstro(LandingHero)

    expect(baseElement.querySelector('#about')).toBeNull()
  })

  it('renders CTAs with correct auth hrefs', async () => {
    const { getByRole } = await renderAstro(LandingHero)

    const getStarted = getByRole('link', { name: /get started/i })
    const login = getByRole('link', { name: /^login$/i })

    expect(getStarted).toHaveAttribute('href', `${APP_BASE}/auth/sign-up`)
    expect(login).toHaveAttribute('href', `${APP_BASE}/auth/login`)
  })

  it('uses a single-column stats grid on mobile', async () => {
    const { container } = await renderAstro(LandingHero)
    const stats = container.querySelector('dl')
    expect(stats).toHaveClass('grid-cols-1', 'sm:grid-cols-3')
  })
})