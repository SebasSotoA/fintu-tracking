package handlers

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

type cashFlowListFilters struct {
	from            *time.Time
	to              *time.Time
	flowType        string
	currency        string
	excludeMirrored bool
}

func appendCashFlowListFilters(query string, args []interface{}, filters cashFlowListFilters) (string, []interface{}) {
	argN := len(args)

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
	if filters.flowType != "" {
		argN++
		query += fmt.Sprintf(" AND type = $%d", argN)
		args = append(args, filters.flowType)
	}
	if filters.currency != "" {
		argN++
		query += fmt.Sprintf(" AND currency = $%d", argN)
		args = append(args, filters.currency)
	}
	if filters.excludeMirrored {
		query += " AND NOT (type = 'fee' AND related_trade_id IS NOT NULL)"
	}

	return query, args
}

func buildCountCashFlowsQuery(userID string, filters cashFlowListFilters) (string, []interface{}) {
	query := `SELECT COUNT(*) FROM cash_flows WHERE user_id = $1`
	args := []interface{}{userID}
	query, args = appendCashFlowListFilters(query, args, filters)
	return query, args
}

func buildListCashFlowsQuery(userID string, filters cashFlowListFilters, limit, offset int) (string, []interface{}) {
	query := `
		SELECT ` + cashFlowListColumns + `
		FROM cash_flows
		WHERE user_id = $1`
	args := []interface{}{userID}
	query, args = appendCashFlowListFilters(query, args, filters)
	query += " ORDER BY date DESC"

	if limit > 0 {
		argN := len(args) + 1
		query += fmt.Sprintf(" LIMIT $%d", argN)
		args = append(args, limit)
		argN++
		query += fmt.Sprintf(" OFFSET $%d", argN)
		args = append(args, offset)
	}

	return query, args
}

func parseCashFlowListFilters(fromStr, toStr, flowType, currency, excludeMirroredStr string) (cashFlowListFilters, error) {
	filters := cashFlowListFilters{
		flowType:        strings.ToLower(strings.TrimSpace(flowType)),
		currency:        strings.ToUpper(strings.TrimSpace(currency)),
		excludeMirrored: true,
	}

	if filters.flowType != "" && filters.flowType != "deposit" && filters.flowType != "withdrawal" && filters.flowType != "fee" && filters.flowType != "cash_adjustment" {
		return filters, fmt.Errorf("invalid type")
	}
	if filters.currency != "" && filters.currency != "USD" && filters.currency != "COP" {
		return filters, fmt.Errorf("invalid currency")
	}
	if strings.TrimSpace(excludeMirroredStr) != "" {
		value, err := strconv.ParseBool(strings.TrimSpace(excludeMirroredStr))
		if err != nil {
			return filters, fmt.Errorf("invalid exclude_mirrored")
		}
		filters.excludeMirrored = value
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
