package repositories

import (
	"strings"
	"testing"
)

func assertSQLFragments(t *testing.T, sql string, fragments []string) {
	t.Helper()
	if sql == "" {
		t.Fatal("SQL returned empty string")
	}
	for _, fragment := range fragments {
		if !strings.Contains(sql, fragment) {
			t.Errorf("SQL missing %q in:\n%s", fragment, sql)
		}
	}
}

func TestNetInvestedSQLContainsCaseLogic(t *testing.T) {
	t.Parallel()

	assertSQLFragments(t, netInvestedSQL(), []string{
		"type = 'deposit'",
		"type = 'withdrawal'",
	})
	if strings.Contains(netInvestedSQL(), "related_cash_flow_id IS NOT NULL") {
		t.Error("net invested SQL must not subtract linked transfer fees")
	}
	assertSQLFragments(t, netInvestedSQLAsOfDate(), []string{
		"date <= $2",
	})
}

func TestPortfolioCashSQLFragments(t *testing.T) {
	t.Parallel()

	assertSQLFragments(t, cashFlowsBalanceSQL(), []string{
		"type = 'deposit'",
		"type = 'withdrawal'",
		"type = 'cash_adjustment'",
		"type = 'fee' AND related_trade_id IS NULL AND related_cash_flow_id IS NULL",
	})
	assertSQLFragments(t, netTradeCashFlowSQL(), []string{
		"side = 'buy'",
		"side = 'sell'",
		"COALESCE(total_fees, 0)",
		"is_opening_position",
	})
}

func TestReturnAttributionHoldingsSQLUsesTotalFees(t *testing.T) {
	t.Parallel()

	sql := returnAttributionHoldingsSQL()
	assertSQLFragments(t, sql, []string{
		"COALESCE(t.total_fees, 0)",
	})
	if strings.Contains(sql, "t.fee") {
		t.Errorf("holdings SQL must not reference legacy t.fee:\n%s", sql)
	}
}

func TestNetWorthHoldingsSQLUsesTotalFees(t *testing.T) {
	t.Parallel()

	sql := netWorthHoldingsSQL()
	assertSQLFragments(t, sql, []string{
		"COALESCE(t.total_fees, 0)",
	})
	if strings.Contains(sql, "t.fee") {
		t.Errorf("net worth holdings SQL must not reference legacy t.fee:\n%s", sql)
	}
}

func TestPerformanceTradeLoadSQLUsesTotalFees(t *testing.T) {
	t.Parallel()

	sql := performanceTradeLoadSQL()
	assertSQLFragments(t, sql, []string{
		"COALESCE(total_fees, 0)",
	})
	if strings.Contains(sql, " fee") && strings.Contains(sql, "COALESCE(fee") {
		t.Errorf("performance load SQL must not use legacy fee column:\n%s", sql)
	}
}