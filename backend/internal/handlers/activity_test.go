package handlers

import (
	"encoding/json"
	"testing"
	"time"

	"fintu-tracking-backend/internal/models"
)

func TestActivityItem_JSONMarshal_AssetType(t *testing.T) {
	t.Parallel()

	item := models.ActivityItem{
		ID:        "trade-123",
		Date:      time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC),
		Kind:      "trade",
		SubKind:   "buy",
		Ticker:    "BTC",
		AssetType: "crypto",
		Direction: "out",
		AmountUSD: "500.00",
		Details:   "buy 0.01 BTC @ $50000",
	}

	data, err := json.Marshal(item)
	if err != nil {
		t.Fatalf("marshal error: %v", err)
	}

	var got map[string]any
	if err := json.Unmarshal(data, &got); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}

	if _, ok := got["asset_type"]; !ok {
		t.Errorf("expected key %q in JSON, got keys: %v", "asset_type", keysOf(got))
	}
	if got["asset_type"] != "crypto" {
		t.Errorf("asset_type = %q, want %q", got["asset_type"], "crypto")
	}
}

func TestActivityItem_JSONMarshal_CashFlowAssetTypeEmpty(t *testing.T) {
	t.Parallel()

	item := models.ActivityItem{
		ID:        "cf-456",
		Date:      time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC),
		Kind:      "deposit",
		SubKind:   "",
		Ticker:    "",
		AssetType: "",
		Direction: "in",
		AmountUSD: "1000.00",
		Details:   "Deposit: COP 4000000",
	}

	data, err := json.Marshal(item)
	if err != nil {
		t.Fatalf("marshal error: %v", err)
	}

	var got map[string]any
	if err := json.Unmarshal(data, &got); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}

	if v, ok := got["asset_type"]; !ok {
		t.Errorf("expected key %q in JSON, got keys: %v", "asset_type", keysOf(got))
	} else if v != "" {
		t.Errorf("asset_type = %q, want empty string for cash flow", v)
	}
}

func keysOf(m map[string]any) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}
