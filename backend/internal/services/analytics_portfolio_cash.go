package services

import (
	"github.com/shopspring/decimal"
)

func portfolioCashAfterTrades(cashFromFlows, tradeCosts decimal.Decimal) decimal.Decimal {
	return cashFromFlows.Sub(tradeCosts)
}

func portfolioNetWorth(holdingsValue, cashAfterTrades decimal.Decimal) decimal.Decimal {
	return holdingsValue.Add(cashAfterTrades)
}

type cashFlowBalanceRow struct {
	Type              string
	USDAmount         decimal.Decimal
	RelatedTradeID    *string
	RelatedCashFlowID *string
}

func sumCashFlowsBalance(flows []cashFlowBalanceRow) decimal.Decimal {
	total := decimal.Zero
	for _, f := range flows {
		switch f.Type {
		case "deposit":
			total = total.Add(f.USDAmount)
		case "withdrawal":
			total = total.Sub(f.USDAmount)
		case "cash_adjustment":
			total = total.Add(f.USDAmount)
		case "fee":
			if f.RelatedTradeID != nil || f.RelatedCashFlowID != nil {
				continue
			}
			total = total.Sub(f.USDAmount)
		}
	}
	return total
}

type tradeCashFlowRow struct {
	Side              string
	Quantity          decimal.Decimal
	Price             decimal.Decimal
	TotalFees         decimal.Decimal
	IsOpeningPosition bool
}

func sumNetTradeCashFlow(trades []tradeCashFlowRow) decimal.Decimal {
	total := decimal.Zero
	for _, tr := range trades {
		switch tr.Side {
		case "buy":
			if tr.IsOpeningPosition {
				continue
			}
			total = total.Add(tr.Quantity.Mul(tr.Price).Add(tr.TotalFees))
		case "sell":
			proceeds := tr.Quantity.Mul(tr.Price).Sub(tr.TotalFees)
			total = total.Sub(proceeds)
		}
	}
	return total
}