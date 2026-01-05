package models

import (
	"time"
)

// FxRate represents a foreign exchange rate record
type FxRate struct {
	ID        string    `json:"id" db:"id"`
	UserID    string    `json:"user_id" db:"user_id"`
	Date      time.Time `json:"date" db:"date"`
	Rate      string    `json:"rate" db:"rate"`
	Source    string    `json:"source" db:"source"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// CashFlow represents a cash flow transaction
type CashFlow struct {
	ID        string    `json:"id" db:"id"`
	UserID    string    `json:"user_id" db:"user_id"`
	Date      time.Time `json:"date" db:"date"`
	Type      string    `json:"type" db:"type"` // deposit, withdrawal, fee
	Currency  string    `json:"currency" db:"currency"` // COP, USD
	Amount    string    `json:"amount" db:"amount"`
	FxRate    *string   `json:"fx_rate" db:"fx_rate"`
	UsdAmount string    `json:"usd_amount" db:"usd_amount"`
	Notes     *string   `json:"notes" db:"notes"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// Trade represents a stock or ETF trade
type Trade struct {
	ID        string    `json:"id" db:"id"`
	UserID    string    `json:"user_id" db:"user_id"`
	Date      time.Time `json:"date" db:"date"`
	Ticker    string    `json:"ticker" db:"ticker"`
	AssetType string    `json:"asset_type" db:"asset_type"` // stock, etf
	Side      string    `json:"side" db:"side"` // buy, sell
	Quantity  string    `json:"quantity" db:"quantity"`
	Price     string    `json:"price" db:"price"`
	Fee       string    `json:"fee" db:"fee"`
	Total     string    `json:"total" db:"total"`
	Notes     *string   `json:"notes" db:"notes"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// MarketPrice represents a cached market price
type MarketPrice struct {
	Ticker    string    `json:"ticker" db:"ticker"`
	Price     string    `json:"price" db:"price"`
	Currency  string    `json:"currency" db:"currency"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// Holding represents a calculated portfolio holding
type Holding struct {
	Ticker              string `json:"ticker"`
	Quantity            string `json:"quantity"`
	AvgCost             string `json:"avgCost"`
	TotalInvested       string `json:"totalInvested"`
	MarketValue         string `json:"marketValue"`
	UnrealizedPL        string `json:"unrealizedPL"`
	UnrealizedPLPercent string `json:"unrealizedPLPercent"`
}

// PerformanceMetrics represents portfolio performance calculations
type PerformanceMetrics struct {
	TotalInvested   string `json:"totalInvested"`
	TotalValue      string `json:"totalValue"`
	TotalReturn     string `json:"totalReturn"`
	TotalReturnPct  string `json:"totalReturnPct"`
	XIRR            string `json:"xirr"`
}

// CreateFxRateRequest for creating a new FX rate
type CreateFxRateRequest struct {
	Date   string `json:"date"`
	Rate   string `json:"rate"`
	Source string `json:"source"`
}

// CreateCashFlowRequest for creating a new cash flow
type CreateCashFlowRequest struct {
	Date     string  `json:"date"`
	Type     string  `json:"type"`
	Currency string  `json:"currency"`
	Amount   string  `json:"amount"`
	FxRate   *string `json:"fx_rate"`
	Notes    *string `json:"notes"`
}

// CreateTradeRequest for creating a new trade
type CreateTradeRequest struct {
	Date      string  `json:"date"`
	Ticker    string  `json:"ticker"`
	AssetType string  `json:"asset_type"`
	Side      string  `json:"side"`
	Quantity  string  `json:"quantity"`
	Price     string  `json:"price"`
	Fee       string  `json:"fee"`
	Notes     *string `json:"notes"`
}

// UpdateFxRateRequest for updating an FX rate
type UpdateFxRateRequest struct {
	Date   *string `json:"date"`
	Rate   *string `json:"rate"`
	Source *string `json:"source"`
}

// UpdateCashFlowRequest for updating a cash flow
type UpdateCashFlowRequest struct {
	Date     *string `json:"date"`
	Type     *string `json:"type"`
	Currency *string `json:"currency"`
	Amount   *string `json:"amount"`
	FxRate   *string `json:"fx_rate"`
	Notes    *string `json:"notes"`
}

// UpdateTradeRequest for updating a trade
type UpdateTradeRequest struct {
	Date      *string `json:"date"`
	Ticker    *string `json:"ticker"`
	AssetType *string `json:"asset_type"`
	Side      *string `json:"side"`
	Quantity  *string `json:"quantity"`
	Price     *string `json:"price"`
	Fee       *string `json:"fee"`
	Notes     *string `json:"notes"`
}

