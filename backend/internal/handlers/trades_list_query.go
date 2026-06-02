package handlers

import (
	"fmt"
	"strings"
	"time"
)

type tradeListFilters struct {
	from      *time.Time
	to        *time.Time
	side      string
	assetType string
	ticker    string
}

func buildListTradesQuery(userID string, filters tradeListFilters) (string, []interface{}) {
	query := `
		SELECT ` + tradeListColumns + `
		FROM trades
		WHERE user_id = $1`
	args := []interface{}{userID}
	argN := 1

	if filters.from != nil {
		argN++
		query += fmt.Sprintf(" AND date >= $%d", argN)
		args = append(args, *filters.from)
	}
	if filters.to != nil {
		argN++
		query += fmt.Sprintf(" AND date <= $%d", argN)
		args = append(args, *filters.to)
	}
	if filters.side != "" {
		argN++
		query += fmt.Sprintf(" AND side = $%d", argN)
		args = append(args, filters.side)
	}
	if filters.assetType != "" {
		argN++
		query += fmt.Sprintf(" AND asset_type = $%d", argN)
		args = append(args, filters.assetType)
	}
	if filters.ticker != "" {
		argN++
		query += fmt.Sprintf(" AND ticker = $%d", argN)
		args = append(args, filters.ticker)
	}

	query += " ORDER BY date DESC"
	return query, args
}

func parseTradeListFilters(fromStr, toStr, side, assetType, ticker string) (tradeListFilters, error) {
	filters := tradeListFilters{
		side:      strings.ToLower(strings.TrimSpace(side)),
		assetType: strings.ToLower(strings.TrimSpace(assetType)),
		ticker:    strings.ToUpper(strings.TrimSpace(ticker)),
	}

	if filters.side != "" && filters.side != "buy" && filters.side != "sell" {
		return filters, fmt.Errorf("invalid side")
	}
	if filters.assetType != "" && filters.assetType != "stock" && filters.assetType != "etf" {
		return filters, fmt.Errorf("invalid asset_type")
	}

	if fromStr != "" {
		t, err := parseTradeDate(fromStr)
		if err != nil {
			return filters, fmt.Errorf("invalid from date")
		}
		filters.from = &t
	}
	if toStr != "" {
		t, err := parseTradeDate(toStr)
		if err != nil {
			return filters, fmt.Errorf("invalid to date")
		}
		filters.to = &t
	}

	return filters, nil
}
