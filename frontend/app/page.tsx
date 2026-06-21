import { LandingNav } from "@/components/layout/landing-nav"
import { LandingAtmosphere } from "@/components/landing/landing-atmosphere"
import { LandingHero } from "@/components/landing/landing-hero"
import { LandingFeatures } from "@/components/landing/landing-features"
import { LandingSocialProof } from "@/components/landing/landing-social-proof"
import { LandingDemo } from "@/components/landing/landing-demo"
import { LandingFooter } from "@/components/landing/landing-footer"
import { landingDisplay } from "@/lib/fonts/landing-display"

export default function HomePage() {
  return (
    <div className={landingDisplay.variable}>
      <LandingAtmosphere>
        <LandingNav />
        <main>
          <LandingHero />
          <LandingFeatures />
          <LandingSocialProof />
          <LandingDemo />
        </main>
        <LandingFooter />
      </LandingAtmosphere>
    </div>
  )
}
