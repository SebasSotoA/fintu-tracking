package handlers

import (
	"strings"
	"testing"
)

func TestParseCashFlowListFilters_Valid(t *testing.T) {
	t.Parallel()

	filters, err := parseCashFlowListFilters("2024-01-01", "2024-12-31", "deposit", "USD", "", "", "")
	if err != nil {
		t.Fatal(err)
	}
	if filters.flowType != "deposit" || filters.currency != "USD" {
		t.Fatalf("got %+v", filters)
	}
	if !filters.excludeMirrored {
		t.Fatal("excludeMirrored should default to true")
	}
	if filters.from == nil || filters.to == nil {
		t.Fatal("expected date bounds")
	}
}

func TestParseCashFlowListFilters_InvalidType(t *testing.T) {
	t.Parallel()

	_, err := parseCashFlowListFilters("", "", "transfer", "", "", "", "")
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestBuildListCashFlowsQuery_Filters(t *testing.T) {
	t.Parallel()

	filters, err := parseCashFlowListFilters("", "", "fee", "COP", "", "", "")
	if err != nil {
		t.Fatal(err)
	}

	query, args := buildListCashFlowsQuery("user-1", filters, 10, 0)
	if strings.Contains(query, "linked_transfer_fee_usd") {
		t.Fatalf("query must not include linked_transfer_fee_usd subquery: %s", query)
	}
	if !strings.Contains(query, "type = $") || !strings.Contains(query, "currency = $") {
		t.Fatalf("query missing filters: %s", query)
	}
	if !strings.Contains(query, "NOT (type = 'fee' AND related_trade_id IS NOT NULL)") {
		t.Fatalf("query should exclude mirrored fees by default: %s", query)
	}
	if len(args) != 5 || args[1] != "fee" || args[2] != "COP" {
		t.Fatalf("args = %v", args)
	}
}

func TestParseCashFlowListFilters_AcceptsCashAdjustmentType(t *testing.T) {
	t.Parallel()

	filters, err := parseCashFlowListFilters("", "", "cash_adjustment", "USD", "", "", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if filters.flowType != "cash_adjustment" {
		t.Fatalf("flowType = %q, want cash_adjustment", filters.flowType)
	}
}

func TestParseCashFlowListFilters_CanDisableExcludeMirrored(t *testing.T) {
	t.Parallel()

	filters, err := parseCashFlowListFilters("", "", "", "", "false", "", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if filters.excludeMirrored {
		t.Fatal("excludeMirrored should be false when query sets exclude_mirrored=false")
	}
}

func TestBuildListCashFlowsQuery_DefaultSortIsDateDescWithTieBreak(t *testing.T) {
	t.Parallel()

	filters, err := parseCashFlowListFilters("", "", "", "", "", "", "")
	if err != nil {
		t.Fatal(err)
	}

	query, args := buildListCashFlowsQuery("user-1", filters, 0, 0)
	if !strings.Contains(query, "ORDER BY date DESC, created_at DESC, id DESC") {
		t.Fatalf("query missing default order: %s", query)
	}
	if len(args) != 1 {
		t.Fatalf("args = %v, want only user_id", args)
	}
}

func TestBuildListCashFlowsQuery_ValidSortAndDir(t *testing.T) {
	t.Parallel()

	filters, err := parseCashFlowListFilters("", "", "", "", "", "amount", "desc")
	if err != nil {
		t.Fatal(err)
	}

	query, args := buildListCashFlowsQuery("user-1", filters, 0, 0)
	if !strings.Contains(query, "ORDER BY amount DESC, created_at DESC, id DESC") {
		t.Fatalf("query missing amount sort: %s", query)
	}
	if len(args) != 1 {
		t.Fatalf("args = %v, want only user_id (sort is identifier, not bind arg)", args)
	}
}

func TestBuildListCashFlowsQuery_UnknownSortFallsBackToDateDesc(t *testing.T) {
	t.Parallel()

	filters, err := parseCashFlowListFilters("", "", "", "", "", "feeAmount", "")
	if err != nil {
		t.Fatal(err)
	}

	query, _ := buildListCashFlowsQuery("user-1", filters, 0, 0)
	if !strings.Contains(query, "ORDER BY date DESC, created_at DESC, id DESC") {
		t.Fatalf("unknown sort should fall back to date DESC: %s", query)
	}
	if strings.Contains(query, "feeAmount") {
		t.Fatalf("query must not interpolate unknown sort key: %s", query)
	}
}

func TestBuildListCashFlowsQuery_InvalidDirFallsBackToDesc(t *testing.T) {
	t.Parallel()

	filters, err := parseCashFlowListFilters("", "", "", "", "", "usd_amount", "sideways")
	if err != nil {
		t.Fatal(err)
	}

	query, _ := buildListCashFlowsQuery("user-1", filters, 0, 0)
	if !strings.Contains(query, "ORDER BY usd_amount DESC, created_at DESC, id DESC") {
		t.Fatalf("invalid dir should fall back to DESC: %s", query)
	}
}

func TestBuildListCashFlowsQuery_RejectsSQLInjectionSort(t *testing.T) {
	t.Parallel()

	filters, err := parseCashFlowListFilters("", "", "", "", "", "date;DROP", "desc")
	if err != nil {
		t.Fatal(err)
	}

	query, _ := buildListCashFlowsQuery("user-1", filters, 0, 0)
	if !strings.Contains(query, "ORDER BY date DESC, created_at DESC, id DESC") {
		t.Fatalf("injection sort should fall back to date DESC: %s", query)
	}
	if strings.Contains(query, "DROP") {
		t.Fatalf("query must not interpolate raw sort string: %s", query)
	}
}
