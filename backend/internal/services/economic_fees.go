package services

import "github.com/shopspring/decimal"

type economicFeeRow struct {
	Type              string
	FeeType           string
	USDAmount         decimal.Decimal
	RelatedTradeID    *string
	RelatedCashFlowID *string
}

func sumEconomicFees(rows []economicFeeRow, tradeTotalFees decimal.Decimal) decimal.Decimal {
	transferFees := decimal.Zero
	for _, row := range rows {
		if row.Type != "fee" {
			continue
		}
		if row.RelatedCashFlowID != nil || row.FeeType == "deposit" || row.FeeType == "withdrawal" {
			transferFees = transferFees.Add(row.USDAmount)
		}
	}
	return transferFees.Add(tradeTotalFees)
}
