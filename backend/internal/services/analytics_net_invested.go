package services

import (
	"github.com/shopspring/decimal"
)

type netInvestedFlow struct {
	Type              string
	USDAmount         decimal.Decimal
	RelatedCashFlowID *string
}

func netInvestedContribution(flowType string, usdAmount decimal.Decimal, _ *string) decimal.Decimal {
	switch flowType {
	case "deposit":
		return usdAmount
	case "withdrawal":
		return usdAmount.Neg()
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

// depositFeeAttributionAmount is the deposit-fee slice shown in return attribution.
func depositFeeAttributionAmount(feeType string, usdAmount decimal.Decimal, _ *string) decimal.Decimal {
	if feeType == "deposit" {
		return usdAmount
	}
	return decimal.Zero
}