package services

import (
	"sort"
	"testing"

	"fintu-tracking-backend/internal/models"
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

	prices := map[string]marketPriceInfo{
		"AAPL": {price: dec("25")},
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
	if h.AvgCost != "15" {
		t.Fatalf("avg cost = %s, want 15", h.AvgCost)
	}
	if h.AvgCostWithFees != "15.2" {
		t.Fatalf("avg cost with fees = %s, want 15.2", h.AvgCostWithFees)
	}
	if h.TotalInvested != "225" {
		t.Fatalf("total invested = %s, want 225", h.TotalInvested)
	}
	if h.TotalInvestedWithFees != "228" {
		t.Fatalf("total invested with fees = %s, want 228", h.TotalInvestedWithFees)
	}
	if h.MarketValue != "375" {
		t.Fatalf("market value = %s, want 375", h.MarketValue)
	}
	if h.UnrealizedPL != "150" {
		t.Fatalf("unrealized PL = %s, want 150", h.UnrealizedPL)
	}
}

func TestComputeHoldingsFromTrades_SortedByMarketValueDescending(t *testing.T) {
	t.Parallel()

	trades := []holdingTradeRow{
		{
			Ticker:    "AAPL",
			AssetType: "stock",
			Side:      "buy",
			Quantity:  dec("10"),
			Price:     dec("100"),
			TotalFees: dec("0"),
		},
		{
			Ticker:    "MSFT",
			AssetType: "stock",
			Side:      "buy",
			Quantity:  dec("5"),
			Price:     dec("300"),
			TotalFees: dec("0"),
		},
		{
			Ticker:    "TSLA",
			AssetType: "stock",
			Side:      "buy",
			Quantity:  dec("2"),
			Price:     dec("200"),
			TotalFees: dec("0"),
		},
	}

	prices := map[string]marketPriceInfo{
		"AAPL": {price: dec("110")},
		"MSFT": {price: dec("310")},
		"TSLA": {price: dec("210")},
	}

	holdingsByTicker := computeHoldingsFromTrades(trades, prices)
	holdings := make([]models.Holding, 0, len(holdingsByTicker))
	for _, h := range holdingsByTicker {
		holdings = append(holdings, h)
	}

	sort.Slice(holdings, func(i, j int) bool {
		a, aErr := decimal.NewFromString(holdings[i].MarketValue)
		b, bErr := decimal.NewFromString(holdings[j].MarketValue)
		if aErr != nil || bErr != nil {
			return holdings[i].Ticker < holdings[j].Ticker
		}
		return b.Cmp(a) < 0
	})

	want := []string{"MSFT", "AAPL", "TSLA"}
	if len(holdings) != len(want) {
		t.Fatalf("len(holdings) = %d, want %d", len(holdings), len(want))
	}
	for i, ticker := range want {
		if holdings[i].Ticker != ticker {
			t.Fatalf("holdings[%d].Ticker = %s, want %s", i, holdings[i].Ticker, ticker)
		}
	}
}
