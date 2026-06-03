package handlers

import (
	"strings"
	"testing"
)

func TestParsePaginationParams_Defaults(t *testing.T) {
	t.Parallel()

	params, err := parsePaginationParams("", "")
	if err != nil {
		t.Fatal(err)
	}
	if params.page != 1 || params.pageSize != 10 {
		t.Fatalf("got page=%d pageSize=%d", params.page, params.pageSize)
	}
}

func TestParsePaginationParams_InvalidPageSize(t *testing.T) {
	t.Parallel()

	_, err := parsePaginationParams("1", "0")
	if err == nil {
		t.Fatal("expected error for invalid page_size")
	}
}

func TestClampPage(t *testing.T) {
	t.Parallel()

	if got := clampPage(5, 40, 50); got != 1 {
		t.Fatalf("clampPage = %d, want 1", got)
	}
	if got := clampPage(3, 120, 50); got != 3 {
		t.Fatalf("clampPage = %d, want 3", got)
	}
}

func TestBuildListTradesQuery_LimitOffset(t *testing.T) {
	t.Parallel()

	query, args := buildListTradesQuery("user-1", tradeListFilters{}, 50, 100)
	if !strings.Contains(query, "LIMIT $2") || !strings.Contains(query, "OFFSET $3") {
		t.Fatalf("query missing limit/offset: %s", query)
	}
	if len(args) != 3 || args[1] != 50 || args[2] != 100 {
		t.Fatalf("args = %v", args)
	}
}
