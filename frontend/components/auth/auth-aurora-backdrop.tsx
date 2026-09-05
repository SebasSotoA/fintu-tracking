"use client"

import dynamic from "next/dynamic"
import { Suspense, type ReactElement } from "react"
import type { AuroraProps } from "@/components/auth/aurora"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

const Aurora = dynamic(() => import("@/components/auth/aurora"), { ssr: false })

export const AUTH_AURORA_PROPS: AuroraProps = {
  colorStops: ["#05dc80", "#02674f", "#16302b"],
  amplitude: 1.2,
  blend: 0.6,
  speed: 0.8,
}

export function AuthAuroraBackdrop(): ReactElement {
  const reducedMotion = usePrefersReducedMotion()

  return (
    <div
      className="fixed inset-0 z-0"
      style={{ backgroundColor: "#000000" }}
      aria-hidden
    >
      {!reducedMotion && (
        <Suspense fallback={null}>
          <Aurora {...AUTH_AURORA_PROPS} />
        </Suspense>
      )}
    </div>
  )
}
