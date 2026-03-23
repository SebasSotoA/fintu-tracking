import Image from "next/image"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { LayoutDashboard } from "lucide-react"

export async function LandingNav() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/20 bg-background/90 backdrop-blur-xl">
      <div className="container mx-auto px-6 flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
          <Image
            src="/fintu-logo.svg"
            alt="Fintu"
            width={114}
            height={28}
            className="h-7 w-auto"
            priority
          />
        </Link>

        {/* Center nav links */}
        <nav className="hidden md:flex items-center gap-1">
          <a
            href="#features"
            className="px-4 py-2 rounded-lg text-sm font-medium text-foreground/60 hover:text-foreground/90 hover:bg-surface-container-low transition-all duration-200"
          >
            Features
          </a>
          <a
            href="#about"
            className="px-4 py-2 rounded-lg text-sm font-medium text-foreground/60 hover:text-foreground/90 hover:bg-surface-container-low transition-all duration-200"
          >
            About
          </a>
        </nav>

        {/* Right CTAs */}
        <div className="flex items-center gap-3">
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
      </div>
    </header>
  )
}
