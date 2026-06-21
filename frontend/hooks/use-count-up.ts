import { useState, useEffect } from "react"

export function useCountUp(target: number, isActive: boolean, duration = 1_400): number {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!isActive) return

    let raf: number | null = null
    let startTime: number | null = null

    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress)
      setCurrent(Math.round(eased * target))

      if (progress < 1) {
        raf = requestAnimationFrame(animate)
      }
    }

    raf = requestAnimationFrame(animate)

    return () => {
      if (raf !== null) cancelAnimationFrame(raf)
    }
  }, [target, duration, isActive])

  return isActive ? current : 0
}
