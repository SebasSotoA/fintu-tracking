import * as React from "react"
import Image from "next/image"
import {
  Bitcoin,
  CircleDollarSign,
  LineChart,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type AssetType = "stock" | "etf" | "crypto"

interface TickerLogoProps {
  ticker: string
  assetType?: AssetType | string | null
  size?: number
  className?: string
}

const TICKER_LOGO_BASE = "https://raw.githubusercontent.com/nvstly/icons/main/ticker_icons"

function getLogoUrl(ticker: string): string | null {
  if (!ticker) return null
  const cleaned = ticker.trim().toUpperCase()
  if (!cleaned) return null
  return `${TICKER_LOGO_BASE}/${encodeURIComponent(cleaned)}.png`
}

function FallbackIcon({ assetType }: { assetType?: string | null }) {
  if (assetType === "crypto") return <Bitcoin className="size-3/5" aria-hidden />
  if (assetType === "etf") return <LineChart className="size-3/5" aria-hidden />
  return <CircleDollarSign className="size-3/5" aria-hidden />
}

export function TickerLogo({
  ticker,
  assetType,
  size = 32,
  className,
}: TickerLogoProps) {
  const url = getLogoUrl(ticker)
  const [failed, setFailed] = React.useState(false)
  const showImage = url && !failed

  React.useEffect(() => {
    setFailed(false)
  }, [url])

  const dim = `${size}px`
  const inner = size * 0.6

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-black text-white ring-1 ring-white/10",
        className,
      )}
      style={{ width: dim, height: dim }}
      aria-hidden
    >
      {showImage ? (
        <Image
          src={url}
          alt=""
          width={inner}
          height={inner}
          unoptimized
          className="object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <FallbackIcon assetType={assetType} />
      )}
    </div>
  )
}