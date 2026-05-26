package services

import (
	"fmt"

	"github.com/shopspring/decimal"
)

const netInvestedCaseExpr = `
  CASE
    WHEN type = 'deposit' THEN usd_amount
    WHEN type = 'withdrawal' THEN -usd_amount
    WHEN type = 'fee' AND related_cash_flow_id IS NOT NULL THEN -usd_amount
    ELSE 0
  END`

func netInvestedSQL() string {
	return fmt.Sprintf(`SELECT COALESCE(SUM(%s), 0) FROM cash_flows WHERE user_id = $1`, netInvestedCaseExpr)
}

func netInvestedSQLAsOfDate() string {
	return fmt.Sprintf(`SELECT COALESCE(SUM(%s), 0) FROM cash_flows WHERE user_id = $1 AND date <= $2`, netInvestedCaseExpr)
}

type netInvestedFlow struct {
	Type              string
	USDAmount         decimal.Decimal
	RelatedCashFlowID *string
}

func netInvestedContribution(flowType string, usdAmount decimal.Decimal, relatedCashFlowID *string) decimal.Decimal {
	switch flowType {
	case "deposit":
		return usdAmount
	case "withdrawal":
		return usdAmount.Neg()
	case "fee":
		if relatedCashFlowID != nil {
			return usdAmount.Neg()
		}
	}
	return decimal.Zero
}

func sumNetInvested(flows []netInvestedFlow) decimal.Decimal {
	total := decimal.Zero
	for _, f := range flows {
		total = total.Add(netInvestedContribution(f.Type, f.USDAmount, f.RelatedCashFlowID))
	}
	return total
}

func depositFeeAttributionAmount(feeType string, usdAmount decimal.Decimal, relatedCashFlowID *string) decimal.Decimal {
	if feeType == "deposit" && relatedCashFlowID == nil {
		return usdAmount
	}
	return decimal.Zero
}
