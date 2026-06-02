export const PERFORMANCE_TOOLTIPS = {
  startingCapital: "Capital deployed at the start of the attribution period.",
  marketGains: "Change in holdings value from market moves, before fees and FX.",
  totalFeesImpact: "All deposit, trading, and closing fees reducing your position.",
  netPosition: "Ending portfolio value after gains, fees, and FX.",
  netWorth: "Ending portfolio value (holdings + cash) after market gains and fees.",
  netReturnPct:
    "Total gain/loss including uninvested cash, as % of capital deployed (total invested).",
  feeDrag:
    "Total fees paid as % of total invested — how much fees reduced your return.",
  timeWeightedReturn:
    "Internal rate of return (XIRR) across cash flows; shown when available from analytics.",
  portfolioVsInvested:
    "Historical portfolio value compared to cumulative invested capital over time.",
  feeEfficiency:
    "Average fee as % of trade notional per ticker — higher values mean more expensive trading.",
} as const
