export const PERFORMANCE_TOOLTIPS = {
  gainLoss:
    "Your total profit or loss after market gains, fees, and FX — compared to what you invested.",
  invested: "Total capital you've put into the market (deposits minus withdrawals).",
  marketGains:
    "How much your holdings went up or down in value from market moves, before fees.",
  feesPaid: "All fees the broker charged you: deposit, trading, and closing fees.",
  fxImpact:
    "Not a cash gain or loss in the brokerage. Applies the gap between the average COP/USD you converted at and today's rate to the USD recorded on those COP deposits.",
  currentValue: "What your portfolio is worth right now: holdings + cash.",
  netWorth:
    "Current market value of all holdings plus uninvested cash, in USD. Gain is USD profit or loss; the percent is that gain divided by money invested.",
  xirr: "Annualised return (XIRR) on your actual cash flows — money in, money out, and current value. A real-world performance rate that accounts for timing.",
  copDeposited: "Recorded pesos you sent to the broker — not a conversion.",
  worthInCopToday:
    "USD net worth converted at today's exchange rate.",
  deposited: "Total COP you sent to the broker across all deposits.",
  arrivedAtBroker:
    "USD that actually cleared into your brokerage account, after wire and transfer fees were deducted.",
  usdConverted:
    "Dollars those pesos bought when you deposited. Not your current net worth, and not after later trades.",
  fxImpactTile:
    "Not a cash gain or loss in the brokerage. Applies the gap between the average COP/USD you converted at and today's rate to the USD recorded on those COP deposits.",
  feesPaidTile:
    "Total fees charged by the broker: deposit/withdrawal wire fees plus trading commissions.",
} as const
