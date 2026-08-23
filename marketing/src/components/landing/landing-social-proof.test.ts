import { describe, expect, it } from 'vitest'
import { renderAstro } from '@/test/astro-render'
import LandingSocialProof from '@/components/landing/landing-social-proof.astro'

describe('LandingSocialProof', () => {
  it('renders the heading and all stat labels', async () => {
    const { getByText } = await renderAstro(LandingSocialProof)

    expect(getByText('Every number accounted for')).toBeInTheDocument()
    expect(getByText('FX Precision')).toBeInTheDocument()
    expect(getByText('Fee Tracking')).toBeInTheDocument()
    expect(getByText('XIRR Accuracy')).toBeInTheDocument()
    expect(getByText('Asset Coverage')).toBeInTheDocument()
  })

  it('shows zero values before intersection (no JS executed)', async () => {
    const { container } = await renderAstro(LandingSocialProof)

    const counters = container.querySelectorAll('[data-count-up]')
    expect(counters.length).toBeGreaterThan(0)
    counters.forEach((el) => {
      expect(el.textContent).toBe('0')
    })
  })

  it('renders all stat descriptions', async () => {
    const { getByText } = await renderAstro(LandingSocialProof)

    expect(
      getByText(
        /every local currency deposit reconciled at the trade-date fx rate/i,
      ),
    ).toBeInTheDocument()
    expect(
      getByText('Fee categories mapped—deposit, transfer, trading, and closing'),
    ).toBeInTheDocument()
  })
})