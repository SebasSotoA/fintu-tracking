package models

import (
	"time"
)

// PaginatedResponse is the envelope for paginated list endpoints.
type PaginatedResponse[T any] struct {
	Items    []T `json:"items"`
	Total    int `json:"total"`
	Page     int `json:"page"`
	PageSize int `json:"page_size"`
}

// FxRate represents a foreign exchange rate record
type FxRate struct {
	ID        string    `json:"id" db:"id"`
	UserID    string    `json:"user_id" db:"user_id"`
	Date      time.Time `json:"date" db:"date"`
	Rate      string    `json:"rate" db:"rate"`
	Source    string    `json:"source" db:"source"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// CashFlow represents a cash flow transaction with enhanced fee tracking
type CashFlow struct {
	ID                string    `json:"id" db:"id"`
	UserID            string    `json:"user_id" db:"user_id"`
	Date              time.Time `json:"date" db:"date"`
	Type              string    `json:"type" db:"type"`         // deposit, withdrawal, fee, cash_adjustment
	Currency          string    `json:"currency" db:"currency"` // COP, USD
	Amount            string    `json:"amount" db:"amount"`
	FxRate            *string   `json:"fx_rate" db:"fx_rate"`
	UsdAmount         string    `json:"usd_amount" db:"usd_amount"`
	Notes             *string   `json:"notes" db:"notes"`
	FeeType           *string   `json:"fee_type" db:"fee_type"` // deposit, trading, closing, maintenance, other, withdrawal
	RelatedTradeID    *string   `json:"related_trade_id" db:"related_trade_id"`
	RelatedCashFlowID *string   `json:"related_cash_flow_id" db:"related_cash_flow_id"`
	RelatedType       *string   `json:"related_type" db:"related_type"` // trade, deposit, withdrawal, standalone
	CreatedAt         time.Time `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time `json:"updated_at" db:"updated_at"`
}

// Trade represents a stock, ETF, or crypto trade with detailed fee breakdown
type Trade struct {
	ID                string    `json:"id" db:"id"`
	UserID            string    `json:"user_id" db:"user_id"`
	Date              time.Time `json:"date" db:"date"`
	Ticker            string    `json:"ticker" db:"ticker"`
	AssetType         string    `json:"asset_type" db:"asset_type"` // stock, etf, crypto
	Side              string    `json:"side" db:"side"`             // buy, sell
	IsOpeningPosition bool      `json:"is_opening_position" db:"is_opening_position"`
	Quantity          string    `json:"quantity" db:"quantity"`
	Price             string    `json:"price" db:"price"`
	DepositFee        string    `json:"deposit_fee" db:"deposit_fee"`
	TradingFee        string    `json:"trading_fee" db:"trading_fee"`
	ClosingFee        string    `json:"closing_fee" db:"closing_fee"`
	TotalFees         string    `json:"total_fees" db:"total_fees"`
	Total             string    `json:"total" db:"total"`
	Notes             *string   `json:"notes" db:"notes"`
	RealizedPL        *string   `json:"realized_pl,omitempty"`
	RealizedPLPct     *string   `json:"realized_pl_pct,omitempty"`
	CreatedAt         time.Time `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time `json:"updated_at" db:"updated_at"`
}

// MarketPrice represents a cached market price
type MarketPrice struct {
	Ticker    string    `json:"ticker" db:"ticker"`
	Price     string    `json:"price" db:"price"`
	Currency  string    `json:"currency" db:"currency"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// PortfolioSnapshot represents a historical snapshot of portfolio state
type PortfolioSnapshot struct {
	ID               string    `json:"id" db:"id"`
	UserID           string    `json:"user_id" db:"user_id"`
	SnapshotDate     time.Time `json:"snapshot_date" db:"snapshot_date"`
	TotalValueUSD    string    `json:"total_value_usd" db:"total_value_usd"`
	TotalInvestedUSD string    `json:"total_invested_usd" db:"total_invested_usd"`
	TotalCashUSD     string    `json:"total_cash_usd" db:"total_cash_usd"`
	TotalFeesUSD     string    `json:"total_fees_usd" db:"total_fees_usd"`
	TotalFXImpactUSD string    `json:"total_fx_impact_usd" db:"total_fx_impact_usd"`
	Holdings         string    `json:"holdings" db:"holdings"` // JSONB stored as string
	Metadata         string    `json:"metadata" db:"metadata"` // JSONB stored as string
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
}

// Holding represents a calculated portfolio holding with enhanced fee information
type Holding struct {
	Ticker              string `json:"ticker"`
	AssetType           string `json:"assetType"`
	Quantity            string `json:"quantity"`
	AvgCost             string `json:"avgCost"`            // Includes pro-rated fees
	AvgCostWithoutFees  string `json:"avgCostWithoutFees"` // Pure price average
	TotalInvested       string `json:"totalInvested"`
	TotalFees           string `json:"totalFees"` // Cumulative fees for this ticker
	MarketValue         string `json:"marketValue"`
	UnrealizedPL        string `json:"unrealizedPL"`
	UnrealizedPLPercent string `json:"unrealizedPLPercent"`
	FeeImpactPercent    string `json:"feeImpactPercent"` // Fees as % of total invested
}

// PerformanceMetrics represents portfolio performance calculations with fee attribution
type PerformanceMetrics struct {
	TotalInvested      string `json:"totalInvested"`
	TotalValue         string `json:"totalValue"`
	TotalCash          string `json:"totalCash"`
	NetWorth           string `json:"netWorth"` // Holdings + Cash
	TotalReturn        string `json:"totalReturn"`
	TotalReturnPct     string `json:"totalReturnPct"`
	TotalFees          string `json:"totalFees"`
	TotalFXImpact      string `json:"totalFxImpact"`
	NetReturnAfterFees string `json:"netReturnAfterFees"`
	XIRR               string `json:"xirr"`
}

// FeeBreakdown represents aggregate fee statistics
type FeeBreakdown struct {
	DepositFees     string            `json:"deposit_fees"`
	TradingFees     string            `json:"trading_fees"`
	ClosingFees     string            `json:"closing_fees"`
	MaintenanceFees string            `json:"maintenance_fees"`
	OtherFees       string            `json:"other_fees"`
	TotalFees       string            `json:"total_fees"`
	FeesByMonth     map[string]string `json:"fees_by_month"`
}

// ReturnAttribution decomposes portfolio returns into components
type ReturnAttribution struct {
	StartingCapital    string `json:"starting_capital"`
	MarketGains        string `json:"market_gains"`
	MarketGainsPct     string `json:"market_gains_pct"`
	DepositFeesImpact  string `json:"deposit_fees_impact"`
	TradingFeesImpact  string `json:"trading_fees_impact"`
	ClosingFeesImpact  string `json:"closing_fees_impact"`
	TotalFeesImpact    string `json:"total_fees_impact"`
	TotalFeesImpactPct string `json:"total_fees_impact_pct"`
	FXImpact           string `json:"fx_impact"`
	FXImpactPct        string `json:"fx_impact_pct"`
	NetPosition        string `json:"net_position"`
	NetReturnPct       string `json:"net_return_pct"`
}

// FXImpactReport analyzes the impact of exchange rate changes
type FXImpactReport struct {
	AvgInvestmentRate string            `json:"avg_investment_rate"` // Weighted avg rate when invested
	CurrentRate       string            `json:"current_rate"`
	RateChangePct     string            `json:"rate_change_pct"`
	FXImpactUSD       string            `json:"fx_impact_usd"`
	FXImpactPct       string            `json:"fx_impact_pct"`
	ImpactByPeriod    map[string]string `json:"impact_by_period"` // Monthly/quarterly breakdown
}

// PerformancePoint represents a point in the performance timeline
type PerformancePoint struct {
	Date               time.Time `json:"date"`
	PortfolioValue     string    `json:"portfolio_value"`
	InvestedCapital    string    `json:"invested_capital"`
	CumulativeFees     string    `json:"cumulative_fees"`
	CumulativeFXImpact string    `json:"cumulative_fx_impact"`
	NetReturn          string    `json:"net_return"`
	NetReturnPct       string    `json:"net_return_pct"`
	SpyIndexed         string    `json:"spy_indexed,omitempty"`
}

// ReconciliationReport checks data integrity between trades and cash flows
type ReconciliationReport struct {
	IsReconciled      bool                  `json:"is_reconciled"`
	TotalTradeFees    string                `json:"total_trade_fees"`
	TotalCashFlowFees string                `json:"total_cash_flow_fees"`
	Difference        string                `json:"difference"`
	MissingLinks      []string              `json:"missing_links"`       // Trade IDs without cash flows
	OrphanedCashFlows []string              `json:"orphaned_cash_flows"` // Cash flow IDs without trades
	UnlinkedCashFlows []string              `json:"unlinked_cash_flows"` // Trade fee cash flows with no related_trade_id
	Discrepancies     []ReconciliationIssue `json:"discrepancies"`
}

// ReconciliationIssue represents a specific reconciliation problem
type ReconciliationIssue struct {
	TradeID            string `json:"trade_id"`
	Ticker             string `json:"ticker"`
	Date               string `json:"date"`
	ExpectedFees       string `json:"expected_fees"`
	ActualCashFlowFees string `json:"actual_cash_flow_fees"`
	Difference         string `json:"difference"`
	Description        string `json:"description"`
}

// NetWorthSummary provides a complete picture of user's financial position
type NetWorthSummary struct {
	HoldingsValue     string            `json:"holdings_value"`
	CashBalance       string            `json:"cash_balance"`
	NetWorth          string            `json:"net_worth"`
	TotalInvested     string            `json:"total_invested"`
	TotalFees         string            `json:"total_fees"`
	TotalGainLoss     string            `json:"total_gain_loss"`
	TotalGainLossPct  string            `json:"total_gain_loss_pct"`
	XIRR              string            `json:"xirr"`
	TotalDepositedCOP string            `json:"total_deposited_cop"`
	TotalWithdrawnCOP string            `json:"total_withdrawn_cop"`
	Breakdown         NetWorthBreakdown `json:"breakdown"`
}

// NetWorthBreakdown provides detailed allocation information
type NetWorthBreakdown struct {
	ByAssetType map[string]string `json:"by_asset_type"` // stock, etf, crypto
	ByTicker    map[string]string `json:"by_ticker"`
	TopHoldings []Holding         `json:"top_holdings"`
}

// CreateFxRateRequest for creating a new FX rate
type CreateFxRateRequest struct {
	Date   string `json:"date"`
	Rate   string `json:"rate"`
	Source string `json:"source"`
}

// CreateCashFlowRequest for creating a new cash flow with enhanced fee tracking
type CreateCashFlowRequest struct {
	Date              string  `json:"date"`
	Type              string  `json:"type"`
	Currency          string  `json:"currency"`
	Amount            string  `json:"amount"`
	FxRate            *string `json:"fx_rate"`
	Notes             *string `json:"notes"`
	FeeType           *string `json:"fee_type"`
	RelatedTradeID    *string `json:"related_trade_id"`
	RelatedCashFlowID *string `json:"related_cash_flow_id"`
	RelatedType       *string `json:"related_type"`
}

// CreateTradeRequest for creating a new trade with detailed fees
type CreateTradeRequest struct {
	Date              string  `json:"date"`
	Ticker            string  `json:"ticker"`
	AssetType         string  `json:"asset_type"`
	Side              string  `json:"side"`
	IsOpeningPosition *bool   `json:"is_opening_position"`
	Quantity          string  `json:"quantity"`
	Price             string  `json:"price"`
	Fee               *string `json:"fee"` // Legacy field
	DepositFee        *string `json:"deposit_fee"`
	TradingFee        *string `json:"trading_fee"`
	ClosingFee        *string `json:"closing_fee"`
	Notes             *string `json:"notes"`
}

// UpdateFxRateRequest for updating an FX rate
type UpdateFxRateRequest struct {
	Date   *string `json:"date"`
	Rate   *string `json:"rate"`
	Source *string `json:"source"`
}

// UpdateCashFlowRequest for updating a cash flow
type UpdateCashFlowRequest struct {
	Date              *string `json:"date"`
	Type              *string `json:"type"`
	Currency          *string `json:"currency"`
	Amount            *string `json:"amount"`
	FxRate            *string `json:"fx_rate"`
	Notes             *string `json:"notes"`
	FeeType           *string `json:"fee_type"`
	RelatedTradeID    *string `json:"related_trade_id"`
	RelatedCashFlowID *string `json:"related_cash_flow_id"`
	RelatedType       *string `json:"related_type"`
}

// UpdateTradeRequest for updating a trade
type UpdateTradeRequest struct {
	Date              *string `json:"date"`
	Ticker            *string `json:"ticker"`
	AssetType         *string `json:"asset_type"`
	Side              *string `json:"side"`
	IsOpeningPosition *bool   `json:"is_opening_position"`
	Quantity          *string `json:"quantity"`
	Price             *string `json:"price"`
	Fee               *string `json:"fee"`
	DepositFee        *string `json:"deposit_fee"`
	TradingFee        *string `json:"trading_fee"`
	ClosingFee        *string `json:"closing_fee"`
	Notes             *string `json:"notes"`
}

// ActivityItem represents a unified feed entry for the activity feed endpoint.
type ActivityItem struct {
	ID        string    `json:"id"`
	Date      time.Time `json:"date"`
	Kind      string    `json:"kind"`       // "trade" | "deposit" | "withdrawal" | "fee" | "cash_adjustment"
	SubKind   string    `json:"sub_kind"`   // trade: "buy"/"sell"; fee: fee_type; deposit/withdrawal/cash_adjustment: ""
	Ticker    string    `json:"ticker"`     // only for trades
	Direction string    `json:"direction"`  // "in" (deposit/buy/credit) or "out" (withdrawal/sell/fee)
	AmountUSD string    `json:"amount_usd"` // absolute USD amount
	Details   string    `json:"details"`    // human-readable summary line
}

// AnalyticsQuery represents a request for analytics with date range filtering
type AnalyticsQuery struct {
	StartDate *string `json:"start_date"`
	EndDate   *string `json:"end_date"`
	Ticker    *string `json:"ticker"`
	Interval  *string `json:"interval"` // day, week, month, year
}
