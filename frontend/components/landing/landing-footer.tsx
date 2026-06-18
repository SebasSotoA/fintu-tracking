import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { FintuLogo } from "@/components/brand/fintu-logo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { landingDisplay } from "@/lib/fonts/landing-display"

const footerLinks = [
  { href: "#features", label: "Features" },
  { href: "#about", label: "About" },
  { href: "/auth/login", label: "Login" },
] as const

export function LandingFooter() {
  return (
    <footer className="relative border-t border-border/40 bg-surface-container-lowest">
      <div className="container mx-auto px-6 py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.2fr_0.8fr] md:items-end">
          <div>
            <Link
              href="/"
              className="inline-flex rounded-lg outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <FintuLogo />
              <span className="sr-only">Fintu</span>
            </Link>
            <p
              className={cn(
                landingDisplay.className,
                "mt-6 max-w-md text-2xl leading-snug tracking-tight text-balance md:text-3xl",
              )}
            >
              Precision for every peso converted, every fee paid, every return earned.
            </p>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              Portfolio tracking for LATAM retail investors holding USD assets—with FX, fees, and
              real performance built in.
            </p>
          </div>

          <div className="flex flex-col gap-8 md:items-end">
            <nav className="flex flex-wrap gap-x-6 gap-y-2 md:justify-end" aria-label="Footer">
              {footerLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-sm text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <Button asChild size="lg" className="w-full gap-2 md:w-auto">
              <Link href="/auth/sign-up">
                Get Started
                <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-border/30 pt-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Fintu. All rights reserved.</p>
          <p className="font-mono tracking-wide text-primary/70">
            COP ↔ USD · fees · XIRR · cost basis
          </p>
        </div>
      </div>
    </footer>
  )
}
