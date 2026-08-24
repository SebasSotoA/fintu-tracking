package services

import (
	"context"
	"fmt"
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
	rows, err := s.repo.GetRealizedPLTrades(ctx, userID)
	if err != nil {
		return nil, err
	}

	var trades []tradeForRealized
	for _, row := range rows {
		qty, err := decimal.NewFromString(row.Quantity)
		if err != nil {
			return nil, fmt.Errorf("parse realized pl quantity %q: %w", row.Quantity, err)
		}
		price, err := decimal.NewFromString(row.Price)
		if err != nil {
			return nil, fmt.Errorf("parse realized pl price %q: %w", row.Price, err)
		}
		fees, err := decimal.NewFromString(row.TotalFees)
		if err != nil {
			return nil, fmt.Errorf("parse realized pl fees %q: %w", row.TotalFees, err)
		}
		trades = append(trades, tradeForRealized{
			ID:        row.ID,
			Date:      row.Date,
			CreatedAt: row.CreatedAt,
			Ticker:    row.Ticker,
			Side:      row.Side,
			Quantity:  qty,
			Price:     price,
			TotalFees: fees,
		})
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
