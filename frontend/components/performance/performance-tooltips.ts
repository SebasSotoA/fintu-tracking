import type { InterpolationVars, MessageKey } from "@/lib/i18n/types"

export type TranslateFn = (key: MessageKey, vars?: InterpolationVars) => string

export function getPerformanceTooltips(t: TranslateFn) {
  return {
    gainLoss: t("performance.tooltips.gainLoss"),
    invested: t("performance.tooltips.invested"),
    marketGains: t("performance.tooltips.marketGains"),
    feesPaid: t("performance.tooltips.feesPaid"),
    fxImpact: t("performance.tooltips.fxImpact"),
    currentValue: t("performance.tooltips.currentValue"),
    netWorth: t("performance.tooltips.netWorth"),
    xirr: t("performance.tooltips.xirr"),
    copDeposited: t("performance.tooltips.copDeposited"),
    worthInCopToday: t("performance.tooltips.worthInCopToday"),
    deposited: t("performance.tooltips.deposited"),
    arrivedAtBroker: t("performance.tooltips.arrivedAtBroker"),
    usdConverted: t("performance.tooltips.usdConverted"),
    fxImpactTile: t("performance.tooltips.fxImpactTile"),
    feesPaidTile: t("performance.tooltips.feesPaidTile"),
  } as const
}
