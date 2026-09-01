"use client"

import type React from "react"
import { useQuery } from "@tanstack/react-query"
import Decimal from "decimal.js"
import { KpiTile } from "@/components/dashboard/kpi-tile"
import {
  getFxImpact,
  getNetWorth,
  getReturnAttribution,
  type FxImpactReport,
  type ReturnAttribution,
} from "@/lib/api/analytics"
import { queryKeys } from "@/lib/api/query-keys"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"
import type { NetWorthData } from "@/lib/types"
import { useLocale } from "@/components/locale-provider"

export interface PerformanceInsightStripProps {
  initialNetWorth?: NetWorthData | null
}

function formatUSD(value: Decimal): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: MARKET_CONFIG.baseCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value.toNumber())
}

function formatSignedUSD(value: Decimal): string {
  const sign = value.greaterThanOrEqualTo(0) ? "+" : "−"
  return `${sign}${formatUSD(value.abs())}`
}

function formatCOP(value: Decimal): string {
  const formatted = new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value.toNumber())
  return `${MARKET_CONFIG.localCurrency} ${formatted}`
}

function hasCopDeposit(value: string | undefined): boolean {
  return value != null && value !== ""
}

export function PerformanceInsightStrip({
  initialNetWorth = null,
}: PerformanceInsightStripProps): React.JSX.Element {
  const { t } = useLocale()
  const netWorthQuery = useQuery<NetWorthData>({
    queryKey: queryKeys.netWorth(),
    queryFn: () => getNetWorth(),
    initialData: initialNetWorth ?? undefined,
    staleTime: 60_000,
  })

  const attributionQuery = useQuery<ReturnAttribution>({
    queryKey: queryKeys.returnAttribution(),
    queryFn: () => getReturnAttribution(),
    staleTime: 60_000,
  })

  const fxQuery = useQuery<FxImpactReport>({
    queryKey: ["fx-impact"],
    queryFn: () => getFxImpact(),
    staleTime: 60_000,
  })

  const isLoading =
    (netWorthQuery.isLoading && !netWorthQuery.data) ||
    (attributionQuery.isLoading && !attributionQuery.data) ||
    (fxQuery.isLoading && !fxQuery.data)

  if (isLoading) {
    return (
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 md:gap-6"
        data-testid="performance-insight-strip"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiTile key={i} label="" value="—" />
        ))}
      </div>
    )
  }

  const netWorth = netWorthQuery.data
  const attribution = attributionQuery.data
  const fxImpact = fxQuery.data

  const depositedCop = hasCopDeposit(netWorth?.total_deposited_cop)
    ? formatCOP(new Decimal(netWorth?.total_deposited_cop || "0"))
    : "—"
  const depositedCaption = hasCopDeposit(netWorth?.total_deposited_cop)
    ? t("performance.totalSentToBroker")
    : netWorth
      ? t("performance.noDepositsRecorded")
      : t("performance.unavailable")

  const arrivedValue = attribution
    ? formatUSD(new Decimal(attribution.starting_capital || "0"))
    : "—"
  const arrivedCaption = attribution ? t("performance.afterWireFees") : t("performance.unavailable")

  const fxValue = fxImpact
    ? formatSignedUSD(new Decimal(fxImpact.fx_impact_usd || "0"))
    : "—"
  const fxCaption = fxImpact ? t("performance.vsTodaysRate") : t("performance.unavailable")

  const feesValue = attribution
    ? formatUSD(new Decimal(attribution.total_fees_impact || "0").abs())
    : "—"
  const feesCaption = attribution ? t("performance.transferPlusTrading") : t("performance.unavailable")

  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 md:gap-6"
      data-testid="performance-insight-strip"
    >
      <KpiTile
        label={t("performance.copDepositedLabel")}
        value={depositedCop}
        caption={depositedCaption}
      />
      <KpiTile
        label={t("performance.arrivedAtBroker")}
        value={arrivedValue}
        caption={arrivedCaption}
      />
      <KpiTile
        label={t("performance.fxImpactLabel")}
        value={fxValue}
        caption={fxCaption}
      />
      <KpiTile
        label={t("performance.feesPaidLabel")}
        value={feesValue}
        caption={feesCaption}
      />
    </div>
  )
}
