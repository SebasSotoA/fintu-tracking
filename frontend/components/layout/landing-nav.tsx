import Image from "next/image"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { LayoutDashboard } from "lucide-react"
import { LandingNavMobile } from "@/components/layout/landing-nav-mobile"

export async function LandingNav() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/20 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center rounded-lg outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Image
            src="/fintu-logo.svg"
            alt="Fintu"
            width={114}
            height={28}
            className="h-7 w-auto"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          <a
            href="#features"
            className="rounded-lg px-4 py-2 text-sm font-medium text-foreground/60 outline-none transition-all duration-200 hover:bg-surface-container-low hover:text-foreground/90 focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Features
          </a>
          <a
            href="#about"
            className="rounded-lg px-4 py-2 text-sm font-medium text-foreground/60 outline-none transition-all duration-200 hover:bg-surface-container-low hover:text-foreground/90 focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            About
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <Button asChild size="sm" className="gap-2">
                <Link href="/dashboard">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/auth/login">Login</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/auth/sign-up">Get Started</Link>
                </Button>
              </>
            )}
          </div>
          <LandingNavMobile isAuthenticated={Boolean(user)} />
        </div>
      </div>
    </header>
  )
}
