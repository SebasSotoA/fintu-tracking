package services

import (
	"context"

	"github.com/shopspring/decimal"
)

// CashBreakdown explains how cash_balance is derived (USD).
type CashBreakdown struct {
	DepositsUSD      string `json:"deposits_usd"`
	WithdrawalsUSD   string `json:"withdrawals_usd"`
	FeesUSD          string `json:"fees_usd"`
	TransferFeesPaidUSD string `json:"transfer_fees_paid_usd"`
	CashFlowsNetUSD  string `json:"cash_flows_net_usd"`
	TradeBuysUSD    string `json:"trade_buys_usd"`
	TradeSellsUSD   string `json:"trade_sells_usd"`
	TradeNetUSD     string `json:"trade_net_usd"`
	CashBalance     string `json:"cash_balance"`
}

func (s *AnalyticsService) GetCashBreakdown(ctx context.Context, userID string) (CashBreakdown, error) {
	out := CashBreakdown{
		DepositsUSD:     "0",
		WithdrawalsUSD:  "0",
		FeesUSD:         "0",
		TransferFeesPaidUSD: "0",
		CashFlowsNetUSD: "0",
		TradeBuysUSD:    "0",
		TradeSellsUSD:   "0",
		TradeNetUSD:     "0",
		CashBalance:     "0",
	}

	var deposits, withdrawals, standaloneFees, transferFees string
	err := s.pool.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(CASE WHEN type = 'deposit' THEN usd_amount ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN usd_amount ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN type = 'fee' AND related_trade_id IS NULL AND related_cash_flow_id IS NULL THEN usd_amount ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN type = 'fee' AND related_cash_flow_id IS NOT NULL THEN usd_amount ELSE 0 END), 0)
		FROM cash_flows WHERE user_id = $1
	`, userID).Scan(&deposits, &withdrawals, &standaloneFees, &transferFees)
	if err != nil {
		return out, err
	}
	out.DepositsUSD = deposits
	out.WithdrawalsUSD = withdrawals
	out.FeesUSD = standaloneFees
	out.TransferFeesPaidUSD = transferFees

	dep, _ := decimal.NewFromString(deposits)
	wd, _ := decimal.NewFromString(withdrawals)
	fee, _ := decimal.NewFromString(standaloneFees)
	cashFlowsNet := dep.Sub(wd).Sub(fee)
	out.CashFlowsNetUSD = cashFlowsNet.String()

	var buySum, sellSum string
	err = s.pool.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(CASE WHEN side = 'buy' THEN quantity * price + COALESCE(total_fees, 0) ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN side = 'sell' THEN quantity * price - COALESCE(total_fees, 0) ELSE 0 END), 0)
		FROM trades WHERE user_id = $1
	`, userID).Scan(&buySum, &sellSum)
	if err != nil {
		return out, err
	}
	out.TradeBuysUSD = buySum
	out.TradeSellsUSD = sellSum

	buys, _ := decimal.NewFromString(buySum)
	sells, _ := decimal.NewFromString(sellSum)
	tradeNet := buys.Sub(sells)
	out.TradeNetUSD = tradeNet.String()

	cash := portfolioCashAfterTrades(cashFlowsNet, tradeNet)
	out.CashBalance = cash.String()

	return out, nil
}
