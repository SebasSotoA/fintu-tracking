export const PERFORMANCE_TOOLTIPS = {
  gainLoss:
    "Your total profit or loss after market gains, fees, and FX — compared to what you invested.",
  invested: "Total capital you've put into the market (deposits minus withdrawals).",
  marketGains:
    "How much your holdings went up or down in value from market moves, before fees.",
  feesPaid: "All fees the broker charged you: deposit, trading, and closing fees.",
  fxImpact:
    "Difference between the exchange rate you received and today's rate, applied to your invested capital. This is a measurement — not a gain or loss judgement.",
  currentValue: "What your portfolio is worth right now: holdings + cash.",
  netWorth: "Current market value of all holdings plus uninvested cash, in USD.",
  xirr: "Annualised return (XIRR) on your actual cash flows — money in, money out, and current value. A real-world performance rate that accounts for timing.",
  copDeposited: "Total pesos sent to the broker, converted at each deposit's exchange rate.",
  worthInCopToday:
    "What your portfolio would be worth if converted back to COP at today's exchange rate.",
  deposited: "Total COP you sent to the broker across all deposits.",
  arrivedAtBroker:
    "USD that actually cleared into your brokerage account, after wire and transfer fees were deducted.",
  fxImpactTile:
    "Difference between the exchange rate you received and today's rate, applied to your invested capital. This is a measurement — not a gain or loss judgement.",
  feesPaidTile:
    "Total fees charged by the broker: deposit/withdrawal wire fees plus trading commissions.",
} as const
