package services

import (
	"testing"

	"github.com/shopspring/decimal"
)

func TestComputeHoldingsFromTrades_UsesRealizedAverageCostWithFees(t *testing.T) {
	t.Parallel()

	trades := []holdingTradeRow{
		{
			Ticker:    "AAPL",
			AssetType: "stock",
			Side:      "buy",
			Quantity:  dec("10"),
			Price:     dec("10"),
			TotalFees: dec("2"),
		},
		{
			Ticker:    "AAPL",
			AssetType: "stock",
			Side:      "buy",
			Quantity:  dec("10"),
			Price:     dec("20"),
			TotalFees: dec("2"),
		},
		{
			Ticker:    "AAPL",
			AssetType: "stock",
			Side:      "sell",
			Quantity:  dec("5"),
			Price:     dec("30"),
			TotalFees: dec("1"),
		},
	}

	prices := map[string]decimal.Decimal{
		"AAPL": dec("25"),
	}

	holdings := computeHoldingsFromTrades(trades, prices)
	if len(holdings) != 1 {
		t.Fatalf("len(holdings) = %d, want 1", len(holdings))
	}

	h, ok := holdings["AAPL"]
	if !ok {
		t.Fatalf("holding for AAPL not found: %#v", holdings)
	}

	if h.Quantity != "15" {
		t.Fatalf("quantity = %s, want 15", h.Quantity)
	}
	if h.AvgCost != "15.2" {
		t.Fatalf("avg cost = %s, want 15.2", h.AvgCost)
	}
	if h.MarketValue != "375" {
		t.Fatalf("market value = %s, want 375", h.MarketValue)
	}
	if h.UnrealizedPL != "147" {
		t.Fatalf("unrealized PL = %s, want 147", h.UnrealizedPL)
	}
}
