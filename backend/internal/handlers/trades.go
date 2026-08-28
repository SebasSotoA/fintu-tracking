package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"fintu-tracking-backend/internal/database"
	"fintu-tracking-backend/internal/httpx"
	"fintu-tracking-backend/internal/middleware"
	"fintu-tracking-backend/internal/models"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"
)

const tradeListColumns = `
	id, user_id, date, ticker, asset_type, side, is_opening_position, quantity, price,
	COALESCE(deposit_fee, 0), COALESCE(trading_fee, 0), COALESCE(closing_fee, 0),
	COALESCE(total_fees, 0), total, broker_id, notes, created_at, updated_at
`

// ListTrades returns trades for the authenticated user with optional filters.
// Without page/page_size query params, returns a plain JSON array (legacy).
// With page or page_size, returns models.PaginatedResponse.
func ListTrades(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	filters, err := parseTradeListFilters(
		r.URL.Query().Get("from"),
		r.URL.Query().Get("to"),
		r.URL.Query().Get("side"),
		r.URL.Query().Get("asset_type"),
		r.URL.Query().Get("ticker"),
	)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	pageStr := r.URL.Query().Get("page")
	pageSizeStr := r.URL.Query().Get("page_size")

	limit := 0
	offset := 0
	page := 1
	pageSize := defaultPageSize

	if paginationRequested(pageStr, pageSizeStr) {
		params, err := parsePaginationParams(pageStr, pageSizeStr)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, err.Error())
			return
		}
		page = params.page
		pageSize = params.pageSize
		limit = pageSize
		offset = (page - 1) * pageSize
	}

	var total int
	if limit > 0 {
		countQuery, countArgs := buildCountTradesQuery(userID, filters)
		if err := database.GetPool().QueryRow(context.Background(), countQuery, countArgs...).Scan(&total); err != nil {
			httpx.Error(w, http.StatusInternalServerError, err.Error())
			return
		}
		page = clampPage(page, total, pageSize)
		offset = (page - 1) * pageSize
	}

	query, args := buildListTradesQuery(userID, filters, limit, offset)

	rows, err := database.GetPool().Query(context.Background(), query, args...)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	trades := make([]models.Trade, 0)
	for rows.Next() {
		trade, err := scanTradeRow(rows)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, err.Error())
			return
		}
		trades = append(trades, trade)
	}

	realizedMap, realizedErr := analyticsService.RealizedPLByTradeID(r.Context(), userID)
	if realizedErr == nil {
		for i := range trades {
			if trades[i].Side != "sell" {
				continue
			}
			pl, ok := realizedMap[trades[i].ID]
			if !ok {
				continue
			}
			plStr := pl.StringFixed(2)
			trades[i].RealizedPL = &plStr
		}
	}

	if limit > 0 {
		httpx.JSON(w, http.StatusOK, models.PaginatedResponse[models.Trade]{
			Items:    trades,
			Total:    total,
			Page:     page,
			PageSize: pageSize,
		})
		return
	}

	httpx.JSON(w, http.StatusOK, trades)
}

// ListTradeTickers returns distinct tickers for the authenticated user (filter combobox).
func ListTradeTickers(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	rows, err := database.GetPool().Query(context.Background(), `
		SELECT DISTINCT ticker FROM trades WHERE user_id = $1 ORDER BY ticker ASC
	`, userID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	tickers := make([]string, 0)
	for rows.Next() {
		var ticker string
		if err := rows.Scan(&ticker); err != nil {
			httpx.Error(w, http.StatusInternalServerError, err.Error())
			return
		}
		tickers = append(tickers, ticker)
	}

	httpx.JSON(w, http.StatusOK, tickers)
}

// CreateTrade creates a new trade
func CreateTrade(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req models.CreateTradeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	req.Ticker = strings.TrimSpace(strings.ToUpper(req.Ticker))
	if req.Ticker == "" {
		httpx.Error(w, http.StatusBadRequest, "Ticker is required")
		return
	}

	if !isValidAssetType(req.AssetType) {
		httpx.Error(w, http.StatusBadRequest, "Invalid asset type")
		return
	}
	if req.Side != "buy" && req.Side != "sell" {
		httpx.Error(w, http.StatusBadRequest, "Invalid side")
		return
	}
	isOpeningPosition := req.IsOpeningPosition != nil && *req.IsOpeningPosition
	if isOpeningPosition && req.Side != "buy" {
		httpx.Error(w, http.StatusBadRequest, "Opening position must use buy side")
		return
	}
	if isOpeningPosition && (req.Notes == nil || strings.TrimSpace(*req.Notes) == "") {
		httpx.Error(w, http.StatusBadRequest, "Notes are required for opening positions")
		return
	}

	quantity, err := decimal.NewFromString(req.Quantity)
	if err != nil || !quantity.GreaterThan(decimal.Zero) {
		httpx.Error(w, http.StatusBadRequest, "Invalid quantity format")
		return
	}

	price, err := decimal.NewFromString(req.Price)
	if err != nil || !price.GreaterThan(decimal.Zero) {
		httpx.Error(w, http.StatusBadRequest, "Invalid price format")
		return
	}

	date, err := parseTradeDate(req.Date)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid date format")
		return
	}

	depositFee, tradingFee, closingFee, err := parseSplitFees(req.DepositFee, req.TradingFee, req.ClosingFee)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	depositFee, tradingFee, closingFee, err = applyLegacyFeeToTrading(req.Fee, depositFee, tradingFee, closingFee)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	if isOpeningPosition && depositFee.Add(tradingFee).Add(closingFee).GreaterThan(decimal.Zero) {
		httpx.Error(w, http.StatusBadRequest, "Opening position cannot include fees")
		return
	}

	if req.Side == "sell" {
		if err := validateSellQuantity(r.Context(), userID, req.Ticker, "", quantity); err != nil {
			httpx.Error(w, http.StatusBadRequest, err.Error())
			return
		}
	}
	if err := validateBrokerID(r.Context(), userID, req.BrokerID); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	id := uuid.New().String()

	query := `
		INSERT INTO trades (
			id, user_id, date, ticker, asset_type, side, is_opening_position, quantity, price, notes,
			deposit_fee, trading_fee, closing_fee, broker_id
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING ` + tradeListColumns

	var trade models.Trade
	err = database.GetPool().QueryRow(context.Background(), query,
		id, userID, date, req.Ticker, req.AssetType, req.Side,
		isOpeningPosition, req.Quantity, req.Price, req.Notes,
		depositFee.StringFixed(2), tradingFee.StringFixed(2), closingFee.StringFixed(2),
		req.BrokerID,
	).Scan(
		&trade.ID, &trade.UserID, &trade.Date, &trade.Ticker, &trade.AssetType,
		&trade.Side, &trade.IsOpeningPosition, &trade.Quantity, &trade.Price,
		&trade.DepositFee, &trade.TradingFee, &trade.ClosingFee, &trade.TotalFees,
		&trade.Total, &trade.BrokerID, &trade.Notes, &trade.CreatedAt, &trade.UpdatedAt,
	)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	httpx.JSON(w, http.StatusCreated, trade)
}

// UpdateTrade updates an existing trade
func UpdateTrade(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	var req models.UpdateTradeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	var existing models.Trade
	loadQuery := `SELECT ` + tradeListColumns + ` FROM trades WHERE id = $1 AND user_id = $2`
	err := database.GetPool().QueryRow(context.Background(), loadQuery, id, userID).Scan(
		&existing.ID, &existing.UserID, &existing.Date, &existing.Ticker, &existing.AssetType,
		&existing.Side, &existing.IsOpeningPosition, &existing.Quantity, &existing.Price,
		&existing.DepositFee, &existing.TradingFee, &existing.ClosingFee, &existing.TotalFees,
		&existing.Total, &existing.BrokerID, &existing.Notes, &existing.CreatedAt, &existing.UpdatedAt,
	)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "Trade not found")
		return
	}

	if req.Date != nil {
		parsed, err := parseTradeDate(*req.Date)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "Invalid date format")
			return
		}
		existing.Date = parsed
	}
	if req.Ticker != nil {
		ticker := strings.TrimSpace(strings.ToUpper(*req.Ticker))
		if ticker == "" {
			httpx.Error(w, http.StatusBadRequest, "Ticker is required")
			return
		}
		existing.Ticker = ticker
	}
	if req.AssetType != nil {
		if !isValidAssetType(*req.AssetType) {
			httpx.Error(w, http.StatusBadRequest, "Invalid asset type")
			return
		}
		existing.AssetType = *req.AssetType
	}
	if req.Side != nil {
		if *req.Side != "buy" && *req.Side != "sell" {
			httpx.Error(w, http.StatusBadRequest, "Invalid side")
			return
		}
		existing.Side = *req.Side
	}
	if req.IsOpeningPosition != nil {
		existing.IsOpeningPosition = *req.IsOpeningPosition
	}
	if existing.IsOpeningPosition && existing.Side != "buy" {
		httpx.Error(w, http.StatusBadRequest, "Opening position must use buy side")
		return
	}
	if req.Quantity != nil {
		existing.Quantity = *req.Quantity
	}
	if req.BrokerID != nil {
		existing.BrokerID = req.BrokerID
	}
	if err := validateBrokerID(r.Context(), userID, existing.BrokerID); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	if req.Price != nil {
		price, err := decimal.NewFromString(*req.Price)
		if err != nil || !price.GreaterThan(decimal.Zero) {
			httpx.Error(w, http.StatusBadRequest, "Invalid price format")
			return
		}
		existing.Price = *req.Price
	}

	depositFee, err := decimal.NewFromString(existing.DepositFee)
	if err != nil {
		depositFee = decimal.Zero
	}
	tradingFee, err := decimal.NewFromString(existing.TradingFee)
	if err != nil {
		tradingFee = decimal.Zero
	}
	closingFee, err := decimal.NewFromString(existing.ClosingFee)
	if err != nil {
		closingFee = decimal.Zero
	}

	if req.DepositFee != nil {
		depositFee, err = parseOptionalFee(req.DepositFee)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "invalid deposit_fee format")
			return
		}
	}
	if req.TradingFee != nil {
		tradingFee, err = parseOptionalFee(req.TradingFee)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "invalid trading_fee format")
			return
		}
	}
	if req.ClosingFee != nil {
		closingFee, err = parseOptionalFee(req.ClosingFee)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "invalid closing_fee format")
			return
		}
	}

	depositFee, tradingFee, closingFee, err = applyLegacyFeeToTrading(req.Fee, depositFee, tradingFee, closingFee)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	if existing.IsOpeningPosition && depositFee.Add(tradingFee).Add(closingFee).GreaterThan(decimal.Zero) {
		httpx.Error(w, http.StatusBadRequest, "Opening position cannot include fees")
		return
	}

	quantity, err := decimal.NewFromString(existing.Quantity)
	if err != nil || !quantity.GreaterThan(decimal.Zero) {
		httpx.Error(w, http.StatusBadRequest, "Invalid quantity format")
		return
	}

	if existing.Side == "sell" {
		if err := validateSellQuantity(r.Context(), userID, existing.Ticker, id, quantity); err != nil {
			httpx.Error(w, http.StatusBadRequest, err.Error())
			return
		}
	}

	notes := existing.Notes
	if req.Notes != nil {
		notes = req.Notes
	}
	if existing.IsOpeningPosition && (notes == nil || strings.TrimSpace(*notes) == "") {
		httpx.Error(w, http.StatusBadRequest, "Notes are required for opening positions")
		return
	}

	updateQuery := `
		UPDATE trades
		SET date = $1, ticker = $2, asset_type = $3, side = $4, is_opening_position = $5, quantity = $6,
		    price = $7, notes = $8, broker_id = $9,
		    deposit_fee = $10, trading_fee = $11, closing_fee = $12,
		    updated_at = NOW()
		WHERE id = $13 AND user_id = $14
	`

	result, err := database.GetPool().Exec(context.Background(), updateQuery,
		existing.Date, existing.Ticker, existing.AssetType, existing.Side, existing.IsOpeningPosition,
		existing.Quantity, existing.Price, notes, existing.BrokerID,
		depositFee.StringFixed(2), tradingFee.StringFixed(2), closingFee.StringFixed(2),
		id, userID,
	)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	if result.RowsAffected() == 0 {
		httpx.Error(w, http.StatusNotFound, "Trade not found")
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]any{"message": "Trade updated successfully"})
}

// DeleteTrade deletes a trade and linked fee cash flows created for that trade.
func DeleteTrade(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	ctx := context.Background()

	_, err := database.GetPool().Exec(ctx, `
		DELETE FROM cash_flows
		WHERE user_id = $1
		  AND related_trade_id = $2
		  AND type = 'fee'
		  AND related_type = 'trade'
	`, userID, id)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	result, err := database.GetPool().Exec(ctx, `DELETE FROM trades WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	if result.RowsAffected() == 0 {
		httpx.Error(w, http.StatusNotFound, "Trade not found")
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]any{"message": "Trade deleted successfully"})
}

func isValidAssetType(assetType string) bool {
	return assetType == "stock" || assetType == "etf" || assetType == "crypto"
}

func scanTradeRow(rows pgx.Rows) (models.Trade, error) {
	var trade models.Trade
	err := rows.Scan(
		&trade.ID, &trade.UserID, &trade.Date, &trade.Ticker, &trade.AssetType,
		&trade.Side, &trade.IsOpeningPosition, &trade.Quantity, &trade.Price,
		&trade.DepositFee, &trade.TradingFee, &trade.ClosingFee, &trade.TotalFees,
		&trade.Total, &trade.BrokerID, &trade.Notes, &trade.CreatedAt, &trade.UpdatedAt,
	)
	return trade, err
}

func applyLegacyFeeToTrading(legacyFee *string, deposit, trading, closing decimal.Decimal) (decimal.Decimal, decimal.Decimal, decimal.Decimal, error) {
	if deposit.Add(trading).Add(closing).GreaterThan(decimal.Zero) {
		return deposit, trading, closing, nil
	}
	if legacyFee == nil || strings.TrimSpace(*legacyFee) == "" {
		return deposit, trading, closing, nil
	}
	mapped, err := decimal.NewFromString(strings.TrimSpace(*legacyFee))
	if err != nil {
		return deposit, trading, closing, fmt.Errorf("invalid fee format")
	}
	if mapped.IsNegative() {
		return deposit, trading, closing, fmt.Errorf("fee cannot be negative")
	}
	return deposit, mapped, closing, nil
}

func parseSplitFees(deposit, trading, closing *string) (decimal.Decimal, decimal.Decimal, decimal.Decimal, error) {
	d, err := parseOptionalFee(deposit)
	if err != nil {
		return decimal.Zero, decimal.Zero, decimal.Zero, fmt.Errorf("invalid deposit_fee format")
	}
	t, err := parseOptionalFee(trading)
	if err != nil {
		return decimal.Zero, decimal.Zero, decimal.Zero, fmt.Errorf("invalid trading_fee format")
	}
	c, err := parseOptionalFee(closing)
	if err != nil {
		return decimal.Zero, decimal.Zero, decimal.Zero, fmt.Errorf("invalid closing_fee format")
	}
	return d, t, c, nil
}

func parseOptionalFee(value *string) (decimal.Decimal, error) {
	if value == nil || strings.TrimSpace(*value) == "" {
		return decimal.Zero, nil
	}
	fee, err := decimal.NewFromString(strings.TrimSpace(*value))
	if err != nil {
		return decimal.Zero, err
	}
	if fee.IsNegative() {
		return decimal.Zero, fmt.Errorf("fee cannot be negative")
	}
	return fee, nil
}

func parseOptionalDecimalPtr(value *string) (*string, error) {
	if value == nil || strings.TrimSpace(*value) == "" {
		return nil, nil
	}
	parsed, err := decimal.NewFromString(strings.TrimSpace(*value))
	if err != nil || !parsed.GreaterThan(decimal.Zero) {
		return nil, fmt.Errorf("invalid decimal")
	}
	s := parsed.String()
	return &s, nil
}

func validateSellQuantity(ctx context.Context, userID, ticker, excludeTradeID string, sellQty decimal.Decimal) error {
	query := `
		SELECT COALESCE(SUM(
			CASE WHEN side = 'buy' THEN quantity ELSE -quantity END
		), 0)
		FROM trades
		WHERE user_id = $1 AND ticker = $2
	`
	args := []any{userID, ticker}
	if excludeTradeID != "" {
		query += ` AND id != $3`
		args = append(args, excludeTradeID)
	}

	var netQty decimal.Decimal
	err := database.GetPool().QueryRow(ctx, query, args...).Scan(&netQty)
	if err != nil {
		return fmt.Errorf("failed to check holdings: %w", err)
	}

	return validateSellQuantityAgainstNetHoldings(ticker, netQty, sellQty)
}

func validateSellQuantityAgainstNetHoldings(ticker string, netQty, sellQty decimal.Decimal) error {
	if sellQty.GreaterThan(netQty) {
		return fmt.Errorf("insufficient holdings: have %s %s, selling %s",
			netQty.String(), ticker, sellQty.String())
	}
	return nil
}

// parseTradeDate accepts YYYY-MM-DD or RFC3339 (frontend may send either).
func parseTradeDate(value string) (time.Time, error) {
	if len(value) >= 10 {
		if t, err := time.Parse("2006-01-02", value[:10]); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("invalid date: %q", value)
}
