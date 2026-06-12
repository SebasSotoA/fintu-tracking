package handlers

import (
	"strings"
	"testing"

	"github.com/shopspring/decimal"
)

func TestValidateSellQuantityAgainstNetHoldings_AllowsSellWithinOpeningPosition(t *testing.T) {
	t.Parallel()

	netQty := decimal.RequireFromString("5")
	sellQty := decimal.RequireFromString("3")
	if err := validateSellQuantityAgainstNetHoldings("AAPL", netQty, sellQty); err != nil {
		t.Fatalf("expected sell to be allowed, got error: %v", err)
	}
}

func TestValidateSellQuantityAgainstNetHoldings_RejectsOversell(t *testing.T) {
	t.Parallel()

	netQty := decimal.RequireFromString("1.5")
	sellQty := decimal.RequireFromString("2")

	err := validateSellQuantityAgainstNetHoldings("AMD", netQty, sellQty)
	if err == nil {
		t.Fatal("expected error")
	}
	if !strings.Contains(err.Error(), "insufficient holdings") {
		t.Fatalf("unexpected error: %v", err)
	}
}
