package handlers

import (
	"strings"
	"testing"
	"time"
)

func TestBuildListTradesQuery_NoFilters(t *testing.T) {
	t.Parallel()

	query, args := buildListTradesQuery("user-1", tradeListFilters{}, 0, 0)
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

	query, args := buildListTradesQuery("user-1", filters, 50, 0)
	if len(args) != 8 {
		t.Fatalf("len(args) = %d, want 8", len(args))
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

	_, err := parseTradeListFilters("", "", "hold", "", "", "", "")
	if err == nil {
		t.Fatal("expected error for invalid side")
	}
}

func TestBuildListTradesQuery_DefaultSortIsDateDescWithTieBreak(t *testing.T) {
	t.Parallel()

	filters, err := parseTradeListFilters("", "", "", "", "", "", "")
	if err != nil {
		t.Fatal(err)
	}

	query, args := buildListTradesQuery("user-1", filters, 0, 0)
	if !strings.Contains(query, "ORDER BY date DESC, created_at DESC, id DESC") {
		t.Fatalf("query missing default order: %s", query)
	}
	if len(args) != 1 {
		t.Fatalf("args = %v, want only user_id", args)
	}
}

func TestBuildListTradesQuery_ValidSortAndDir(t *testing.T) {
	t.Parallel()

	filters, err := parseTradeListFilters("", "", "", "", "", "ticker", "asc")
	if err != nil {
		t.Fatal(err)
	}

	query, args := buildListTradesQuery("user-1", filters, 0, 0)
	if !strings.Contains(query, "ORDER BY ticker ASC, created_at DESC, id DESC") {
		t.Fatalf("query missing ticker sort: %s", query)
	}
	if len(args) != 1 {
		t.Fatalf("args = %v, want only user_id (sort is identifier, not bind arg)", args)
	}
}

func TestBuildListTradesQuery_UnknownSortFallsBackToDateDesc(t *testing.T) {
	t.Parallel()

	filters, err := parseTradeListFilters("", "", "", "", "", "realized_pl", "")
	if err != nil {
		t.Fatal(err)
	}

	query, _ := buildListTradesQuery("user-1", filters, 0, 0)
	if !strings.Contains(query, "ORDER BY date DESC, created_at DESC, id DESC") {
		t.Fatalf("unknown sort should fall back to date DESC: %s", query)
	}
	if strings.Contains(query, "realized_pl") {
		t.Fatalf("query must not interpolate unknown sort key: %s", query)
	}
}

func TestBuildListTradesQuery_InvalidDirFallsBackToDesc(t *testing.T) {
	t.Parallel()

	filters, err := parseTradeListFilters("", "", "", "", "", "ticker", "sideways")
	if err != nil {
		t.Fatal(err)
	}

	query, _ := buildListTradesQuery("user-1", filters, 0, 0)
	if !strings.Contains(query, "ORDER BY ticker DESC, created_at DESC, id DESC") {
		t.Fatalf("invalid dir should fall back to DESC: %s", query)
	}
}

func TestBuildListTradesQuery_RejectsSQLInjectionSort(t *testing.T) {
	t.Parallel()

	filters, err := parseTradeListFilters("", "", "", "", "", "date;DROP", "desc")
	if err != nil {
		t.Fatal(err)
	}

	query, _ := buildListTradesQuery("user-1", filters, 0, 0)
	if !strings.Contains(query, "ORDER BY date DESC, created_at DESC, id DESC") {
		t.Fatalf("injection sort should fall back to date DESC: %s", query)
	}
	if strings.Contains(query, "DROP") {
		t.Fatalf("query must not interpolate raw sort string: %s", query)
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
