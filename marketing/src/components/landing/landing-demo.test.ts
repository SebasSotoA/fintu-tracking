import { describe, expect, it } from 'vitest'
import { renderAstro } from '@/test/astro-render'
import LandingDemo from '@/components/landing/landing-demo.astro'

describe('LandingDemo', () => {
  it('renders the heading and all step labels', async () => {
    const { getByText, getAllByText } = await renderAstro(LandingDemo)

    expect(getByText('How it works')).toBeInTheDocument()
    expect(getByText(/from local deposit to us position/i)).toBeInTheDocument()
    expect(getAllByText('Deposit local currency').length).toBeGreaterThanOrEqual(1)
    expect(getAllByText('FX Conversion').length).toBeGreaterThanOrEqual(1)
    expect(getAllByText('Net Buying Power').length).toBeGreaterThanOrEqual(1)
    expect(getAllByText('Buy US position').length).toBeGreaterThanOrEqual(1)
  })

  it('mentions Hapi as a Colombia broker example', async () => {
    const { getByText } = await renderAstro(LandingDemo)

    expect(getByText(/hapi in colombia/i)).toBeInTheDocument()
  })

  it('shows the first step initially', async () => {
    const { getByText } = await renderAstro(LandingDemo)

    expect(getByText('Step 1 of 4')).toBeInTheDocument()
    expect(getByText(/500,000/)).toBeInTheDocument()
  })

  it('renders step navigation buttons with accessible labels', async () => {
    const { getByRole } = await renderAstro(LandingDemo)

    expect(getByRole('button', { name: /go to step 1/i })).toBeInTheDocument()
    expect(getByRole('button', { name: /go to step 4/i })).toBeInTheDocument()
  })

  it('uses at least 40px tap targets for step buttons', async () => {
    const { getByRole } = await renderAstro(LandingDemo)

    const step4Button = getByRole('button', { name: /go to step 4/i })
    expect(step4Button).toHaveClass('min-h-10')
    const stepDot = step4Button.querySelector('.min-h-10')
    expect(stepDot).not.toBeNull()
    expect(stepDot).toHaveClass('min-w-10')
  })
})