"use client"

import dynamic from "next/dynamic"
import { Suspense, type ReactElement } from "react"
import type { AuroraProps } from "@/components/auth/aurora"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

const Aurora = dynamic(() => import("@/components/auth/aurora"), { ssr: false })

export const AUTH_AURORA_PROPS: AuroraProps = {
  colorStops: ["#4338CA", "#6366F1", "#4F46E5"],
  amplitude: 1.2,
  blend: 0.6,
  speed: 0.8,
}

export function AuthAuroraBackdrop(): ReactElement {
  const reducedMotion = usePrefersReducedMotion()

  return (
    <div
      className="fixed inset-0 z-0"
      style={{ backgroundColor: "#0B0F17" }}
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
