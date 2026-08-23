import { describe, expect, it } from 'vitest'
import { renderAstro } from '@/test/astro-render'
import LandingFeatures from '@/components/landing/landing-features.astro'

describe('LandingFeatures', () => {
  it('renders all four feature titles', async () => {
    const { getByRole } = await renderAstro(LandingFeatures)

    expect(
      getByRole('heading', { name: 'Local Currency Deposits', level: 3 }),
    ).toBeInTheDocument()
    expect(
      getByRole('heading', { name: 'Broker Fees in Basis', level: 3 }),
    ).toBeInTheDocument()
    expect(
      getByRole('heading', { name: 'US Holdings View', level: 3 }),
    ).toBeInTheDocument()
    expect(
      getByRole('heading', { name: 'True Performance', level: 3 }),
    ).toBeInTheDocument()
  })

  it('emphasizes US holdings, local currency, and broker fees', async () => {
    const { getAllByText, queryByText } = await renderAstro(LandingFeatures)

    expect(getAllByText(/local currency deposits/i).length).toBeGreaterThanOrEqual(1)
    expect(getAllByText(/broker fees/i).length).toBeGreaterThanOrEqual(1)
    expect(queryByText(/us stocks, etfs, and crypto/i)).not.toBeNull()
  })
})