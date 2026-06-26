package handlers

import (
	"testing"

	"fintu-tracking-backend/internal/models"
)

func TestPaginateHoldings_BasicPage(t *testing.T) {
	t.Parallel()

	holdings := []models.Holding{
		{Ticker: "AAPL"},
		{Ticker: "MSFT"},
		{Ticker: "TSLA"},
		{Ticker: "NVDA"},
	}

	result := paginateHoldings(holdings, 1, 2)

	if result.Total != 4 {
		t.Fatalf("total = %d, want 4", result.Total)
	}
	if result.Page != 1 {
		t.Fatalf("page = %d, want 1", result.Page)
	}
	if result.PageSize != 2 {
		t.Fatalf("pageSize = %d, want 2", result.PageSize)
	}
	if len(result.Items) != 2 {
		t.Fatalf("len(items) = %d, want 2", len(result.Items))
	}
	if result.Items[0].Ticker != "AAPL" || result.Items[1].Ticker != "MSFT" {
		t.Fatalf("unexpected items: %v", result.Items)
	}
}

func TestPaginateHoldings_SecondPage(t *testing.T) {
	t.Parallel()

	holdings := []models.Holding{
		{Ticker: "AAPL"},
		{Ticker: "MSFT"},
		{Ticker: "TSLA"},
		{Ticker: "NVDA"},
	}

	result := paginateHoldings(holdings, 2, 2)

	if result.Page != 2 {
		t.Fatalf("page = %d, want 2", result.Page)
	}
	if len(result.Items) != 2 {
		t.Fatalf("len(items) = %d, want 2", len(result.Items))
	}
	if result.Items[0].Ticker != "TSLA" || result.Items[1].Ticker != "NVDA" {
		t.Fatalf("unexpected items: %v", result.Items)
	}
}

func TestPaginateHoldings_ClampedPage(t *testing.T) {
	t.Parallel()

	holdings := []models.Holding{
		{Ticker: "AAPL"},
		{Ticker: "MSFT"},
	}

	result := paginateHoldings(holdings, 5, 2)

	if result.Page != 1 {
		t.Fatalf("page = %d, want 1", result.Page)
	}
	if len(result.Items) != 2 {
		t.Fatalf("len(items) = %d, want 2", len(result.Items))
	}
}

func TestPaginateHoldings_EmptyList(t *testing.T) {
	t.Parallel()

	result := paginateHoldings([]models.Holding{}, 1, 10)

	if result.Total != 0 {
		t.Fatalf("total = %d, want 0", result.Total)
	}
	if result.Page != 1 {
		t.Fatalf("page = %d, want 1", result.Page)
	}
	if len(result.Items) != 0 {
		t.Fatalf("len(items) = %d, want 0", len(result.Items))
	}
}
