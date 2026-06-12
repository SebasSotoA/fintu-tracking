package services

import (
	"strings"
	"testing"

	"github.com/shopspring/decimal"
)

func TestNetInvestedContribution(t *testing.T) {
	t.Parallel()

	linkedID := "cf-linked-1"

	tests := []struct {
		name              string
		flowType          string
		usdAmount         string
		relatedCashFlowID *string
		want              string
	}{
		{
			name:      "deposit adds amount",
			flowType:  "deposit",
			usdAmount: "400",
			want:      "400",
		},
		{
			name:      "withdrawal subtracts amount",
			flowType:  "withdrawal",
			usdAmount: "100",
			want:      "-100",
		},
		{
			name:              "linked deposit fee does not affect net invested",
			flowType:          "fee",
			usdAmount:         "6",
			relatedCashFlowID: &linkedID,
			want:              "0",
		},
		{
			name:      "standalone fee does not affect net invested",
			flowType:  "fee",
			usdAmount: "5",
			want:      "0",
		},
		{
			name:      "trading fee with trade link does not affect net invested",
			flowType:  "fee",
			usdAmount: "2.50",
			want:      "0",
		},
		{
			name:      "unrelated type ignored",
			flowType:  "transfer",
			usdAmount: "50",
			want:      "0",
		},
		{
			name:      "cash adjustment does not affect net invested",
			flowType:  "cash_adjustment",
			usdAmount: "75",
			want:      "0",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			amount, err := decimal.NewFromString(tt.usdAmount)
			if err != nil {
				t.Fatalf("parse amount: %v", err)
			}
			want, err := decimal.NewFromString(tt.want)
			if err != nil {
				t.Fatalf("parse want: %v", err)
			}
			got := netInvestedContribution(tt.flowType, amount, tt.relatedCashFlowID)
			if !got.Equal(want) {
				t.Errorf("netInvestedContribution() = %s, want %s", got, want)
			}
		})
	}
}

func TestSumNetInvested(t *testing.T) {
	t.Parallel()

	linkedID := "deposit-row-id"

	tests := []struct {
		name  string
		flows []netInvestedFlow
		want  string
	}{
		{
			name: "net deposit 398.01 with linked fee audit row",
			flows: []netInvestedFlow{
				{Type: "deposit", USDAmount: dec("398.01")},
				{Type: "fee", USDAmount: dec("6"), RelatedCashFlowID: &linkedID},
			},
			want: "398.01",
		},
		{
			name: "net deposit 394 with linked fee audit row",
			flows: []netInvestedFlow{
				{Type: "deposit", USDAmount: dec("394")},
				{Type: "fee", USDAmount: dec("6"), RelatedCashFlowID: &linkedID},
			},
			want: "394",
		},
		{
			name: "standalone fee does not reduce net invested",
			flows: []netInvestedFlow{
				{Type: "deposit", USDAmount: dec("1000")},
				{Type: "fee", USDAmount: dec("25")},
			},
			want: "1000",
		},
		{
			name: "trading fee does not reduce net invested",
			flows: []netInvestedFlow{
				{Type: "deposit", USDAmount: dec("500")},
				{Type: "fee", USDAmount: dec("3")},
			},
			want: "500",
		},
		{
			name: "withdrawal reduces net invested",
			flows: []netInvestedFlow{
				{Type: "deposit", USDAmount: dec("1000")},
				{Type: "withdrawal", USDAmount: dec("200")},
			},
			want: "800",
		},
		{
			name:  "empty flows",
			flows: nil,
			want:  "0",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			want := dec(tt.want)
			got := sumNetInvested(tt.flows)
			if !got.Equal(want) {
				t.Errorf("sumNetInvested() = %s, want %s", got, want)
			}
		})
	}
}

func TestDepositFeeAttributionAmount(t *testing.T) {
	t.Parallel()

	linkedID := "cf-1"

	tests := []struct {
		name              string
		feeType           string
		usdAmount         string
		relatedCashFlowID *string
		want              string
	}{
		{
			name:      "unlinked deposit fee counts in attribution",
			feeType:   "deposit",
			usdAmount: "10",
			want:      "10",
		},
		{
			name:              "linked deposit fee included in attribution display",
			feeType:           "deposit",
			usdAmount:         "6",
			relatedCashFlowID: &linkedID,
			want:              "6",
		},
		{
			name:      "trading fee not counted as deposit fee attribution",
			feeType:   "trading",
			usdAmount: "5",
			want:      "0",
		},
		{
			name:      "closing fee not counted as deposit fee attribution",
			feeType:   "closing",
			usdAmount: "3",
			want:      "0",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			amount := dec(tt.usdAmount)
			want := dec(tt.want)
			got := depositFeeAttributionAmount(tt.feeType, amount, tt.relatedCashFlowID)
			if !got.Equal(want) {
				t.Errorf("depositFeeAttributionAmount() = %s, want %s", got, want)
			}
		})
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

func dec(s string) decimal.Decimal {
	d, err := decimal.NewFromString(s)
	if err != nil {
		panic(err)
	}
	return d
}

func TestPortfolioNetWorth_Deposit400LinkedFee6BuyTrade(t *testing.T) {
	t.Parallel()

	depositID := "dep-1"
	flows := []cashFlowBalanceRow{
		{Type: "deposit", USDAmount: dec("394")},
		{Type: "fee", USDAmount: dec("6"), RelatedCashFlowID: &depositID},
	}
	trades := []tradeCashFlowRow{
		{Side: "buy", Quantity: dec("2"), Price: dec("150"), TotalFees: dec("1")},
	}

	cashFlowsNet := sumCashFlowsBalance(flows)
	tradeCosts := sumNetTradeCashFlow(trades)
	holdingsAtMarket := dec("2").Mul(dec("150"))

	cashAfterTrades := portfolioCashAfterTrades(cashFlowsNet, tradeCosts)
	netPosition := portfolioNetWorth(holdingsAtMarket, cashAfterTrades)
	netWorth := portfolioNetWorth(holdingsAtMarket, cashAfterTrades)

	const roundingTolerance = "0.01"
	tol, err := decimal.NewFromString(roundingTolerance)
	if err != nil {
		t.Fatalf("parse tolerance: %v", err)
	}

	diff := netPosition.Sub(netWorth).Abs()
	if diff.GreaterThan(tol) {
		t.Fatalf("net_position %s vs net_worth %s differ by %s (max %s)",
			netPosition, netWorth, diff, roundingTolerance)
	}

	want := dec("393")
	if netPosition.Sub(want).Abs().GreaterThan(tol) {
		t.Fatalf("net_position = %s, want %s within %s", netPosition, want, roundingTolerance)
	}

	brokenNet := holdingsAtMarket.Add(cashFlowsNet)
	if brokenNet.Sub(netPosition).Abs().LessThanOrEqual(tol) {
		t.Fatalf("fixture would not detect double-count; broken=%s", brokenNet)
	}

}

func TestSumCashFlowsBalance_SkipsLinkedTransferFees(t *testing.T) {
	t.Parallel()

	depositID := "dep-net-322"
	flows := []cashFlowBalanceRow{
		{Type: "deposit", USDAmount: dec("322")},
		{Type: "fee", USDAmount: dec("1.99"), RelatedCashFlowID: &depositID},
	}

	got := sumCashFlowsBalance(flows)
	want := dec("322")
	if !got.Equal(want) {
		t.Fatalf("cash flows balance = %s, want %s (linked transfer fee must not subtract again)", got, want)
	}
}

func TestSumCashFlowsBalance_AppliesCashAdjustment(t *testing.T) {
	t.Parallel()

	flows := []cashFlowBalanceRow{
		{Type: "deposit", USDAmount: dec("200")},
		{Type: "cash_adjustment", USDAmount: dec("-25.50")},
		{Type: "cash_adjustment", USDAmount: dec("10")},
	}

	got := sumCashFlowsBalance(flows)
	want := dec("184.50")
	if !got.Equal(want) {
		t.Fatalf("cash flows balance = %s, want %s", got, want)
	}
}

func TestPortfolioCash_ExcludesMirroredTradeFees(t *testing.T) {
	t.Parallel()

	tradeID := "trade-abc"
	flows := []cashFlowBalanceRow{
		{Type: "deposit", USDAmount: dec("400")},
		{Type: "fee", USDAmount: dec("6")},
		{Type: "fee", USDAmount: dec("1"), RelatedTradeID: &tradeID},
	}
	trades := []tradeCashFlowRow{
		{Side: "buy", Quantity: dec("2"), Price: dec("150"), TotalFees: dec("1")},
	}

	cashFlowsNet := sumCashFlowsBalance(flows)
	tradeCosts := sumNetTradeCashFlow(trades)
	cashAfterTrades := portfolioCashAfterTrades(cashFlowsNet, tradeCosts)

	want := dec("93")
	if !cashAfterTrades.Equal(want) {
		t.Fatalf("cash = %s, want %s (mirrored trade fee must not double-count)", cashAfterTrades, want)
	}
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

func TestSumNetTradeCashFlow_OpeningBuyDoesNotChangeCash(t *testing.T) {
	t.Parallel()

	trades := []tradeCashFlowRow{
		{
			Side:              "buy",
			Quantity:          dec("10"),
			Price:             dec("100"),
			TotalFees:         dec("0"),
			IsOpeningPosition: true,
		},
		{
			Side:              "sell",
			Quantity:          dec("2"),
			Price:             dec("110"),
			TotalFees:         dec("1"),
			IsOpeningPosition: false,
		},
	}

	got := sumNetTradeCashFlow(trades)
	want := dec("-219")
	if !got.Equal(want) {
		t.Fatalf("trade cash flow = %s, want %s", got, want)
	}
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

func TestSumEconomicFees_TransferAndTradingOnly(t *testing.T) {
	t.Parallel()

	linkedDepositID := "dep-1"
	linkedTradeID := "tr-1"
	rows := []economicFeeRow{
		{Type: "fee", FeeType: "deposit", USDAmount: dec("1.99"), RelatedCashFlowID: &linkedDepositID},
		{Type: "fee", FeeType: "withdrawal", USDAmount: dec("2"), RelatedCashFlowID: &linkedDepositID},
		{Type: "fee", FeeType: "trading", USDAmount: dec("5"), RelatedTradeID: &linkedTradeID},
		{Type: "fee", FeeType: "other", USDAmount: dec("7")},
	}

	tradeTotalFees := dec("5")
	got := sumEconomicFees(rows, tradeTotalFees)
	want := dec("8.99")
	if !got.Equal(want) {
		t.Fatalf("economic fees = %s, want %s", got, want)
	}
}
