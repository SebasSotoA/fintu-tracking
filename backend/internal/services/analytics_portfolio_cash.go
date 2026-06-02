package services

import (
	"fmt"

	"github.com/shopspring/decimal"
)

const cashFlowsBalanceCaseExpr = `
  CASE
    WHEN type = 'deposit' THEN usd_amount
    WHEN type = 'withdrawal' THEN -usd_amount
    WHEN type = 'fee' THEN -usd_amount
    ELSE 0
  END`

const netTradeCashFlowCaseExpr = `
  CASE
    WHEN side = 'buy' THEN (quantity * price + COALESCE(fee, 0))
    WHEN side = 'sell' THEN -(quantity * price - COALESCE(fee, 0))
    ELSE 0
  END`

func cashFlowsBalanceSQL() string {
	return fmt.Sprintf(`SELECT COALESCE(SUM(%s), 0) FROM cash_flows WHERE user_id = $1`, cashFlowsBalanceCaseExpr)
}

func netTradeCashFlowSQL() string {
	return fmt.Sprintf(`SELECT COALESCE(SUM(%s), 0) FROM trades WHERE user_id = $1`, netTradeCashFlowCaseExpr)
}

func portfolioCashAfterTrades(cashFromFlows, tradeCosts decimal.Decimal) decimal.Decimal {
	return cashFromFlows.Sub(tradeCosts)
}

func portfolioNetWorth(holdingsValue, cashAfterTrades decimal.Decimal) decimal.Decimal {
	return holdingsValue.Add(cashAfterTrades)
}

type cashFlowBalanceRow struct {
	Type      string
	USDAmount decimal.Decimal
}

func sumCashFlowsBalance(flows []cashFlowBalanceRow) decimal.Decimal {
	total := decimal.Zero
	for _, f := range flows {
		switch f.Type {
		case "deposit":
			total = total.Add(f.USDAmount)
		case "withdrawal":
			total = total.Sub(f.USDAmount)
		case "fee":
			total = total.Sub(f.USDAmount)
		}
	}
	return total
}

type tradeCashFlowRow struct {
	Side     string
	Quantity decimal.Decimal
	Price    decimal.Decimal
	Fee      decimal.Decimal
}

func sumNetTradeCashFlow(trades []tradeCashFlowRow) decimal.Decimal {
	total := decimal.Zero
	for _, tr := range trades {
		switch tr.Side {
		case "buy":
			total = total.Add(tr.Quantity.Mul(tr.Price).Add(tr.Fee))
		case "sell":
			proceeds := tr.Quantity.Mul(tr.Price).Sub(tr.Fee)
			total = total.Sub(proceeds)
		}
	}
	return total
}
