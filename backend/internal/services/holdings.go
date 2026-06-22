package services

import (
	"context"
	"fmt"
	"sort"
	"time"

	"fintu-tracking-backend/internal/models"
	"github.com/shopspring/decimal"
)

type holdingTradeRow struct {
	Date      time.Time
	CreatedAt time.Time
	Ticker    string
	AssetType string
	Side      string
	Quantity  decimal.Decimal
	Price     decimal.Decimal
	TotalFees decimal.Decimal
}

type holdingPosition struct {
	assetType      string
	qty            decimal.Decimal
	costBasis      decimal.Decimal
	pureCostBasis  decimal.Decimal
	lastTradePrice decimal.Decimal
}

type marketPriceInfo struct {
	price     decimal.Decimal
	updatedAt *time.Time
}

func (s *AnalyticsService) GetCurrentHoldings(ctx context.Context, userID string) ([]models.Holding, error) {
	trades, err := s.loadHoldingTrades(ctx, userID)
	if err != nil {
		return nil, err
	}
	prices, err := s.loadMarketPrices(ctx)
	if err != nil {
		return nil, err
	}

	holdingsByTicker := computeHoldingsFromTrades(trades, prices)
	holdings := make([]models.Holding, 0, len(holdingsByTicker))
	for _, h := range holdingsByTicker {
		holdings = append(holdings, h)
	}

	sort.Slice(holdings, func(i, j int) bool {
		return holdings[i].Ticker < holdings[j].Ticker
	})

	return holdings, nil
}

func (s *AnalyticsService) loadHoldingTrades(ctx context.Context, userID string) ([]holdingTradeRow, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT date, created_at, ticker, asset_type, side, quantity, price, COALESCE(total_fees, 0)
		FROM trades
		WHERE user_id = $1
		ORDER BY date ASC, created_at ASC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("load holding trades: %w", err)
	}
	defer rows.Close()

	trades := make([]holdingTradeRow, 0)
	for rows.Next() {
		var tr holdingTradeRow
		var qtyStr, priceStr, feesStr string
		if err := rows.Scan(
			&tr.Date,
			&tr.CreatedAt,
			&tr.Ticker,
			&tr.AssetType,
			&tr.Side,
			&qtyStr,
			&priceStr,
			&feesStr,
		); err != nil {
			return nil, fmt.Errorf("scan holding trade: %w", err)
		}

		tr.Quantity, err = decimal.NewFromString(qtyStr)
		if err != nil {
			return nil, fmt.Errorf("parse trade quantity %q: %w", qtyStr, err)
		}
		tr.Price, err = decimal.NewFromString(priceStr)
		if err != nil {
			return nil, fmt.Errorf("parse trade price %q: %w", priceStr, err)
		}
		tr.TotalFees, err = decimal.NewFromString(feesStr)
		if err != nil {
			return nil, fmt.Errorf("parse trade fees %q: %w", feesStr, err)
		}

		trades = append(trades, tr)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate holding trades: %w", err)
	}

	return trades, nil
}

func (s *AnalyticsService) loadMarketPrices(ctx context.Context) (map[string]marketPriceInfo, error) {
	rows, err := s.pool.Query(ctx, `SELECT ticker, price, updated_at FROM market_prices`)
	if err != nil {
		return nil, fmt.Errorf("load market prices: %w", err)
	}
	defer rows.Close()

	prices := make(map[string]marketPriceInfo)
	for rows.Next() {
		var ticker, priceStr string
		var updatedAt *time.Time
		if err := rows.Scan(&ticker, &priceStr, &updatedAt); err != nil {
			return nil, fmt.Errorf("scan market price: %w", err)
		}
		price, err := decimal.NewFromString(priceStr)
		if err != nil {
			return nil, fmt.Errorf("parse market price %q: %w", priceStr, err)
		}
		prices[ticker] = marketPriceInfo{price: price, updatedAt: updatedAt}
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate market prices: %w", err)
	}

	return prices, nil
}

func computeHoldingsFromTrades(trades []holdingTradeRow, prices map[string]marketPriceInfo) map[string]models.Holding {
	sort.SliceStable(trades, func(i, j int) bool {
		if trades[i].Date.Equal(trades[j].Date) {
			return trades[i].CreatedAt.Before(trades[j].CreatedAt)
		}
		return trades[i].Date.Before(trades[j].Date)
	})

	positions := make(map[string]holdingPosition)
	for _, tr := range trades {
		pos := positions[tr.Ticker]
		if pos.assetType == "" {
			pos.assetType = tr.AssetType
		}
		pos.lastTradePrice = tr.Price

		switch tr.Side {
		case "buy":
			notional := tr.Quantity.Mul(tr.Price)
			pos.qty = pos.qty.Add(tr.Quantity)
			pos.pureCostBasis = pos.pureCostBasis.Add(notional)
			pos.costBasis = pos.costBasis.Add(notional.Add(tr.TotalFees))
		case "sell":
			if pos.qty.LessThanOrEqual(decimal.Zero) {
				break
			}
			sellQty := tr.Quantity
			if sellQty.GreaterThan(pos.qty) {
				sellQty = pos.qty
			}
			avgCost := pos.costBasis.Div(pos.qty)
			avgPureCost := pos.pureCostBasis.Div(pos.qty)
			pos.qty = pos.qty.Sub(sellQty)
			pos.costBasis = pos.costBasis.Sub(avgCost.Mul(sellQty))
			pos.pureCostBasis = pos.pureCostBasis.Sub(avgPureCost.Mul(sellQty))
			if pos.qty.IsZero() {
				pos.costBasis = decimal.Zero
				pos.pureCostBasis = decimal.Zero
			}
		}

		positions[tr.Ticker] = pos
	}

	holdings := make(map[string]models.Holding)
	for ticker, pos := range positions {
		if !pos.qty.GreaterThan(decimal.Zero) {
			continue
		}

		info, ok := prices[ticker]
		marketPrice := pos.lastTradePrice
		var priceAsOf *string
		if ok {
			marketPrice = info.price
			if info.updatedAt != nil {
				formatted := info.updatedAt.UTC().Format(time.RFC3339)
				priceAsOf = &formatted
			}
		}

		avgCost := pos.costBasis.Div(pos.qty)
		avgCostWithoutFees := pos.pureCostBasis.Div(pos.qty)
		marketValue := pos.qty.Mul(marketPrice)
		unrealizedPL := marketValue.Sub(pos.costBasis)
		unrealizedPLPct := decimal.Zero
		if !pos.costBasis.IsZero() {
			unrealizedPLPct = unrealizedPL.Div(pos.costBasis).Mul(decimal.NewFromInt(100))
		}

		remainingFees := pos.costBasis.Sub(pos.pureCostBasis)
		feeImpactPct := decimal.Zero
		if !pos.costBasis.IsZero() {
			feeImpactPct = remainingFees.Div(pos.costBasis).Mul(decimal.NewFromInt(100))
		}

		holdings[ticker] = models.Holding{
			Ticker:              ticker,
			AssetType:           pos.assetType,
			Quantity:            pos.qty.String(),
			AvgCost:             avgCost.String(),
			AvgCostWithoutFees:  avgCostWithoutFees.String(),
			TotalInvested:       pos.costBasis.String(),
			TotalFees:           remainingFees.String(),
			MarketValue:         marketValue.String(),
			UnrealizedPL:        unrealizedPL.String(),
			UnrealizedPLPercent: unrealizedPLPct.String(),
			FeeImpactPercent:    feeImpactPct.String(),
			PriceAsOf:           priceAsOf,
		}
	}

	return holdings
}
