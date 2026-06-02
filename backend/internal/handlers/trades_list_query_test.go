package handlers

import (
	"strings"
	"testing"
	"time"
)

func TestBuildListTradesQuery_NoFilters(t *testing.T) {
	t.Parallel()

	query, args := buildListTradesQuery("user-1", tradeListFilters{})
	if len(args) != 1 || args[0] != "user-1" {
		t.Fatalf("args = %v, want [user-1]", args)
	}
	if !strings.Contains(query, "WHERE user_id = $1") {
		t.Errorf("query missing user filter: %s", query)
	}
	if strings.Contains(query, " AND date >=") {
		t.Error("unexpected date filter")
	}
}

func TestBuildListTradesQuery_AllFilters(t *testing.T) {
	t.Parallel()

	from := mustParseTradeDate(t, "2026-01-01")
	to := mustParseTradeDate(t, "2026-01-31")
	filters := tradeListFilters{
		from:      &from,
		to:        &to,
		side:      "buy",
		assetType: "stock",
		ticker:    "AAPL",
	}

	query, args := buildListTradesQuery("user-1", filters)
	if len(args) != 6 {
		t.Fatalf("len(args) = %d, want 6", len(args))
	}
	for _, fragment := range []string{
		"date >= $2",
		"date <= $3",
		"side = $4",
		"asset_type = $5",
		"ticker = $6",
	} {
		if !strings.Contains(query, fragment) {
			t.Errorf("query missing %q:\n%s", fragment, query)
		}
	}
}

func TestParseTradeListFilters_InvalidSide(t *testing.T) {
	t.Parallel()

	_, err := parseTradeListFilters("", "", "hold", "", "")
	if err == nil {
		t.Fatal("expected error for invalid side")
	}
}

func mustParseTradeDate(t *testing.T, s string) time.Time {
	t.Helper()
	parsed, err := parseTradeDate(s)
	if err != nil {
		t.Fatalf("parseTradeDate(%q): %v", s, err)
	}
	return parsed
}
