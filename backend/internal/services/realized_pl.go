package services

import (
	"context"
	"sort"
	"time"

	"github.com/shopspring/decimal"
)

type tradeForRealized struct {
	ID        string
	Date      time.Time
	CreatedAt time.Time
	Ticker    string
	Side      string
	Quantity  decimal.Decimal
	Price     decimal.Decimal
	TotalFees decimal.Decimal
}

type positionLot struct {
	qty       decimal.Decimal
	costBasis decimal.Decimal
}

func sellProceeds(qty, price, totalFees decimal.Decimal) decimal.Decimal {
	if qty.LessThanOrEqual(decimal.Zero) {
		return decimal.Zero
	}
	return qty.Mul(price).Sub(totalFees)
}

// RealizedPLByTradeID maps sell trade IDs to realized P/L (USD) using average cost per ticker.
func (s *AnalyticsService) RealizedPLByTradeID(ctx context.Context, userID string) (map[string]decimal.Decimal, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, date, created_at, ticker, side, quantity, price, COALESCE(total_fees, 0)
		FROM trades
		WHERE user_id = $1
		ORDER BY date ASC, created_at ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var trades []tradeForRealized
	for rows.Next() {
		var t tradeForRealized
		var qtyStr, priceStr, feesStr string
		if err := rows.Scan(&t.ID, &t.Date, &t.CreatedAt, &t.Ticker, &t.Side, &qtyStr, &priceStr, &feesStr); err != nil {
			return nil, err
		}
		t.Quantity, _ = decimal.NewFromString(qtyStr)
		t.Price, _ = decimal.NewFromString(priceStr)
		t.TotalFees, _ = decimal.NewFromString(feesStr)
		trades = append(trades, t)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	sort.Slice(trades, func(i, j int) bool {
		if trades[i].Date.Equal(trades[j].Date) {
			return trades[i].CreatedAt.Before(trades[j].CreatedAt)
		}
		return trades[i].Date.Before(trades[j].Date)
	})

	positions := make(map[string]positionLot)
	result := make(map[string]decimal.Decimal)

	for _, t := range trades {
		pos := positions[t.Ticker]
		switch t.Side {
		case "buy":
			cost := t.Quantity.Mul(t.Price).Add(t.TotalFees)
			pos.qty = pos.qty.Add(t.Quantity)
			pos.costBasis = pos.costBasis.Add(cost)
		case "sell":
			if pos.qty.LessThanOrEqual(decimal.Zero) {
				break
			}
			sellQty := t.Quantity
			if sellQty.GreaterThan(pos.qty) {
				sellQty = pos.qty
			}
			feePart := decimal.Zero
			if t.Quantity.IsPositive() {
				feePart = t.TotalFees.Mul(sellQty).Div(t.Quantity)
			}
			avgCost := pos.costBasis.Div(pos.qty)
			costSold := avgCost.Mul(sellQty)
			proceeds := sellQty.Mul(t.Price).Sub(feePart)
			result[t.ID] = proceeds.Sub(costSold)
			pos.qty = pos.qty.Sub(sellQty)
			pos.costBasis = pos.costBasis.Sub(costSold)
			if pos.qty.IsZero() {
				pos.costBasis = decimal.Zero
			}
		}
		positions[t.Ticker] = pos
	}

	return result, nil
}
