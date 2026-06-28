package handlers

import (
	"context"
	"fmt"

	"fintu-tracking-backend/internal/config"
	"fintu-tracking-backend/internal/database"

	"github.com/shopspring/decimal"
)

func computeGrossUsd(currency string, amount decimal.Decimal, fxRate *decimal.Decimal) (decimal.Decimal, error) {
	if currency == config.BaseCurrency {
		return amount, nil
	}
	if fxRate == nil {
		return decimal.Zero, fmt.Errorf("FX rate required for %s transactions", config.LocalCurrency)
	}
	if fxRate.IsZero() {
		return decimal.Zero, fmt.Errorf("FX rate must be non-zero")
	}
	return amount.Div(*fxRate), nil
}

func computeNetTransferUsd(gross decimal.Decimal, linkedFees []decimal.Decimal) decimal.Decimal {
	net := gross
	for _, fee := range linkedFees {
		net = net.Sub(fee)
	}
	return net
}

func sumLinkedTransferFeesUSD(ctx context.Context, parentID string) (decimal.Decimal, error) {
	var sumStr string
	err := database.GetPool().QueryRow(ctx, `
		SELECT COALESCE(SUM(usd_amount), 0)::text
		FROM cash_flows
		WHERE related_cash_flow_id = $1 AND type = 'fee'
	`, parentID).Scan(&sumStr)
	if err != nil {
		return decimal.Zero, err
	}
	sum, err := decimal.NewFromString(sumStr)
	if err != nil {
		return decimal.Zero, fmt.Errorf("parse linked fees sum: %w", err)
	}
	return sum, nil
}

func recomputeTransferNetUSD(ctx context.Context, parentID, userID string) error {
	var parentType, currency, amountStr string
	var fxRateStr *string
	err := database.GetPool().QueryRow(ctx, `
		SELECT type, currency, amount::text, fx_rate::text
		FROM cash_flows
		WHERE id = $1 AND user_id = $2
	`, parentID, userID).Scan(&parentType, &currency, &amountStr, &fxRateStr)
	if err != nil {
		return fmt.Errorf("load parent cash flow: %w", err)
	}
	if parentType != "deposit" && parentType != "withdrawal" {
		return nil
	}

	amount, err := decimal.NewFromString(amountStr)
	if err != nil {
		return fmt.Errorf("parse parent amount: %w", err)
	}

	var fxRate *decimal.Decimal
	if fxRateStr != nil && *fxRateStr != "" {
		r, err := decimal.NewFromString(*fxRateStr)
		if err != nil {
			return fmt.Errorf("parse parent fx rate: %w", err)
		}
		fxRate = &r
	}

	gross, err := computeGrossUsd(currency, amount, fxRate)
	if err != nil {
		return err
	}

	linkedFeesSum, err := sumLinkedTransferFeesUSD(ctx, parentID)
	if err != nil {
		return err
	}

	net := computeNetTransferUsd(gross, []decimal.Decimal{linkedFeesSum})
	_, err = database.GetPool().Exec(ctx, `
		UPDATE cash_flows SET usd_amount = $1, updated_at = NOW()
		WHERE id = $2 AND user_id = $3
	`, net.String(), parentID, userID)
	return err
}

func isTransferParentType(flowType string) bool {
	return flowType == "deposit" || flowType == "withdrawal"
}
