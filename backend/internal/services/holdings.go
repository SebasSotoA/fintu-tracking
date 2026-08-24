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

// GetCurrentHoldingsByMarketValue returns all current holdings sorted by market
// value descending, used by paginated views where the most valuable positions
// should appear first.
func (s *AnalyticsService) GetCurrentHoldingsByMarketValue(ctx context.Context, userID string) ([]models.Holding, error) {
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
		a, aErr := decimal.NewFromString(holdings[i].MarketValue)
		b, bErr := decimal.NewFromString(holdings[j].MarketValue)
		if aErr != nil || bErr != nil {
			return holdings[i].Ticker < holdings[j].Ticker
		}
		return b.Cmp(a) < 0
	})

	return holdings, nil
}

func (s *AnalyticsService) loadHoldingTrades(ctx context.Context, userID string) ([]holdingTradeRow, error) {
	rows, err := s.repo.LoadHoldingTrades(ctx, userID)
	if err != nil {
		return nil, err
	}

	trades := make([]holdingTradeRow, 0, len(rows))
	for _, row := range rows {
		qty, err := decimal.NewFromString(row.Quantity)
		if err != nil {
			return nil, fmt.Errorf("parse trade quantity %q: %w", row.Quantity, err)
		}
		price, err := decimal.NewFromString(row.Price)
		if err != nil {
			return nil, fmt.Errorf("parse trade price %q: %w", row.Price, err)
		}
		fees, err := decimal.NewFromString(row.TotalFees)
		if err != nil {
			return nil, fmt.Errorf("parse trade fees %q: %w", row.TotalFees, err)
		}
		trades = append(trades, holdingTradeRow{
			Date:      row.Date,
			CreatedAt: row.CreatedAt,
			Ticker:    row.Ticker,
			AssetType: row.AssetType,
			Side:      row.Side,
			Quantity:  qty,
			Price:     price,
			TotalFees: fees,
		})
	}
	return trades, nil
}

func (s *AnalyticsService) loadMarketPrices(ctx context.Context) (map[string]marketPriceInfo, error) {
	rows, err := s.repo.LoadMarketPrices(ctx)
	if err != nil {
		return nil, err
	}

	prices := make(map[string]marketPriceInfo, len(rows))
	for _, row := range rows {
		price, err := decimal.NewFromString(row.Price)
		if err != nil {
			return nil, fmt.Errorf("parse market price %q: %w", row.Price, err)
		}
		prices[row.Ticker] = marketPriceInfo{price: price, updatedAt: row.UpdatedAt}
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

		avgCost := pos.pureCostBasis.Div(pos.qty)
		avgCostWithFees := pos.costBasis.Div(pos.qty)
		marketValue := pos.qty.Mul(marketPrice)
		unrealizedPL := marketValue.Sub(pos.pureCostBasis)
		unrealizedPLPct := decimal.Zero
		if !pos.pureCostBasis.IsZero() {
			unrealizedPLPct = unrealizedPL.Div(pos.pureCostBasis).Mul(decimal.NewFromInt(100))
		}

		remainingFees := pos.costBasis.Sub(pos.pureCostBasis)
		feeImpactPct := decimal.Zero
		if !pos.pureCostBasis.IsZero() {
			feeImpactPct = remainingFees.Div(pos.pureCostBasis).Mul(decimal.NewFromInt(100))
		}

		holdings[ticker] = models.Holding{
			Ticker:              ticker,
			AssetType:           pos.assetType,
			Quantity:            pos.qty.String(),
			AvgCost:             avgCost.String(),
			AvgCostWithFees:     avgCostWithFees.String(),
			AvgCostWithoutFees:  avgCost.String(),
			TotalInvested:       pos.pureCostBasis.String(),
			TotalInvestedWithFees: pos.costBasis.String(),
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
