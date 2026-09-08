package handlers

import (
	"strings"
	"testing"
)

func TestParseListSort_UnknownKeyAndInvalidDirFallBack(t *testing.T) {
	t.Parallel()

	allowed := map[string]string{"amount": "amount"}
	got := parseListSort("nope", "sideways", allowed)
	if got.column != "date" || got.dir != "DESC" {
		t.Fatalf("got %+v, want date DESC", got)
	}
}

func TestParseListSort_ValidKeyIsCaseInsensitive(t *testing.T) {
	t.Parallel()

	allowed := map[string]string{"ticker": "ticker"}
	got := parseListSort(" Ticker ", "ASC", allowed)
	if got.column != "ticker" || got.dir != "ASC" {
		t.Fatalf("got %+v, want ticker ASC", got)
	}
}

func TestParseListSort_RejectsUnsafeWhitelistValue(t *testing.T) {
	t.Parallel()

	allowed := map[string]string{"amount": "amount;DROP TABLE t"}
	got := parseListSort("amount", "asc", allowed)
	if got.column != "date" {
		t.Fatalf("column = %q, want date", got.column)
	}
	if strings.Contains(got.orderByClause(), "DROP") {
		t.Fatalf("order clause interpolated unsafe map value: %s", got.orderByClause())
	}
}

func TestListSortOrderByClause_IgnoresUnsafeColumnAndDir(t *testing.T) {
	t.Parallel()

	got := listSort{column: "date;DROP TABLE t", dir: "DESC; DROP"}.orderByClause()
	want := " ORDER BY date DESC, created_at DESC, id DESC"
	if got != want {
		t.Fatalf("got %q, want %q", got, want)
	}
}
