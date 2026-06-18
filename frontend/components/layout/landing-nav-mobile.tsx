"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { LayoutDashboard, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface LandingNavMobileProps {
  isAuthenticated: boolean
}

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#about", label: "About" },
] as const

export function LandingNavMobile({ isAuthenticated }: LandingNavMobileProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  return (
    <div className="md:hidden">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-expanded={open}
        aria-controls="landing-mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      <div
        id="landing-mobile-menu"
        inert={!open || undefined}
        className={cn(
          "fixed inset-x-0 top-16 z-40 border-b border-border/40 bg-background/95 backdrop-blur-xl transition-all duration-300 motion-reduce:transition-none",
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0",
        )}
        aria-hidden={!open}
      >
        <nav className="container mx-auto flex flex-col gap-1 px-6 py-4">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-3 text-sm font-medium text-foreground/80 outline-none transition-colors hover:bg-surface-container-low hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/40"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="mt-3 flex flex-col gap-2 border-t border-border/30 pt-4">
            {isAuthenticated ? (
              <Button asChild className="w-full gap-2">
                <Link href="/dashboard" onClick={() => setOpen(false)}>
                  <LayoutDashboard className="size-4" />
                  Dashboard
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/auth/login" onClick={() => setOpen(false)}>
                    Login
                  </Link>
                </Button>
                <Button asChild className="w-full">
                  <Link href="/auth/sign-up" onClick={() => setOpen(false)}>
                    Get Started
                  </Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      </div>

      {open ? (
        <button
          type="button"
          aria-label="Close menu overlay"
          className="fixed inset-0 top-16 z-30 bg-black/40 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
          onClick={() => setOpen(false)}
        />
      ) : null}
    </div>
  )
}
