package handlers

import (
	"context"
	"fintu-tracking-backend/internal/database"
	"fintu-tracking-backend/internal/middleware"
	"fintu-tracking-backend/internal/models"
	"fintu-tracking-backend/internal/services"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"
)

const tradeListColumns = `
	id, user_id, date, ticker, asset_type, side, is_opening_position, quantity, price,
	COALESCE(deposit_fee, 0), COALESCE(trading_fee, 0), COALESCE(closing_fee, 0),
	COALESCE(total_fees, 0), total, notes, created_at, updated_at
`

// ListTrades returns trades for the authenticated user with optional filters.
// Without page/page_size query params, returns a plain JSON array (legacy).
// With page or page_size, returns models.PaginatedResponse.
func ListTrades(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	filters, err := parseTradeListFilters(
		c.Query("from"),
		c.Query("to"),
		c.Query("side"),
		c.Query("asset_type"),
		c.Query("ticker"),
	)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	pageStr := c.Query("page")
	pageSizeStr := c.Query("page_size")

	limit := 0
	offset := 0
	page := 1
	pageSize := defaultPageSize

	if paginationRequested(pageStr, pageSizeStr) {
		params, err := parsePaginationParams(pageStr, pageSizeStr)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
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
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		page = clampPage(page, total, pageSize)
		offset = (page - 1) * pageSize
	}

	query, args := buildListTradesQuery(userID, filters, limit, offset)

	rows, err := database.GetPool().Query(context.Background(), query, args...)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	trades := make([]models.Trade, 0)
	for rows.Next() {
		trade, err := scanTradeRow(rows)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		trades = append(trades, trade)
	}

	realizedMap, realizedErr := services.NewAnalyticsService(database.GetPool()).RealizedPLByTradeID(c.Context(), userID)
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
		return c.JSON(models.PaginatedResponse[models.Trade]{
			Items:    trades,
			Total:    total,
			Page:     page,
			PageSize: pageSize,
		})
	}

	return c.JSON(trades)
}

// ListTradeTickers returns distinct tickers for the authenticated user (filter combobox).
func ListTradeTickers(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	rows, err := database.GetPool().Query(context.Background(), `
		SELECT DISTINCT ticker FROM trades WHERE user_id = $1 ORDER BY ticker ASC
	`, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	tickers := make([]string, 0)
	for rows.Next() {
		var ticker string
		if err := rows.Scan(&ticker); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		tickers = append(tickers, ticker)
	}

	return c.JSON(tickers)
}

// CreateTrade creates a new trade
func CreateTrade(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req models.CreateTradeRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	req.Ticker = strings.TrimSpace(strings.ToUpper(req.Ticker))
	if req.Ticker == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Ticker is required"})
	}

	if req.AssetType != "stock" && req.AssetType != "etf" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid asset type"})
	}
	if req.Side != "buy" && req.Side != "sell" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid side"})
	}
	isOpeningPosition := req.IsOpeningPosition != nil && *req.IsOpeningPosition
	if isOpeningPosition && req.Side != "buy" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Opening position must use buy side"})
	}
	if isOpeningPosition && (req.Notes == nil || strings.TrimSpace(*req.Notes) == "") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Notes are required for opening positions"})
	}

	quantity, err := decimal.NewFromString(req.Quantity)
	if err != nil || !quantity.GreaterThan(decimal.Zero) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid quantity format"})
	}

	price, err := decimal.NewFromString(req.Price)
	if err != nil || !price.GreaterThan(decimal.Zero) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid price format"})
	}

	date, err := parseTradeDate(req.Date)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid date format"})
	}

	depositFee, tradingFee, closingFee, err := parseSplitFees(req.DepositFee, req.TradingFee, req.ClosingFee)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	depositFee, tradingFee, closingFee, err = applyLegacyFeeToTrading(req.Fee, depositFee, tradingFee, closingFee)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if isOpeningPosition && depositFee.Add(tradingFee).Add(closingFee).GreaterThan(decimal.Zero) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Opening position cannot include fees"})
	}

	if req.Side == "sell" {
		if err := validateSellQuantity(context.Background(), userID, req.Ticker, "", quantity); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
	}

	id := uuid.New().String()

	query := `
		INSERT INTO trades (
			id, user_id, date, ticker, asset_type, side, is_opening_position, quantity, price, notes,
			deposit_fee, trading_fee, closing_fee
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING ` + tradeListColumns

	var trade models.Trade
	err = database.GetPool().QueryRow(context.Background(), query,
		id, userID, date, req.Ticker, req.AssetType, req.Side,
		isOpeningPosition, req.Quantity, req.Price, req.Notes,
		depositFee.StringFixed(2), tradingFee.StringFixed(2), closingFee.StringFixed(2),
	).Scan(
		&trade.ID, &trade.UserID, &trade.Date, &trade.Ticker, &trade.AssetType,
		&trade.Side, &trade.IsOpeningPosition, &trade.Quantity, &trade.Price,
		&trade.DepositFee, &trade.TradingFee, &trade.ClosingFee, &trade.TotalFees,
		&trade.Total, &trade.Notes, &trade.CreatedAt, &trade.UpdatedAt,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(trade)
}

// UpdateTrade updates an existing trade
func UpdateTrade(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id := c.Params("id")
	var req models.UpdateTradeRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	var existing models.Trade
	loadQuery := `SELECT ` + tradeListColumns + ` FROM trades WHERE id = $1 AND user_id = $2`
	err := database.GetPool().QueryRow(context.Background(), loadQuery, id, userID).Scan(
		&existing.ID, &existing.UserID, &existing.Date, &existing.Ticker, &existing.AssetType,
		&existing.Side, &existing.IsOpeningPosition, &existing.Quantity, &existing.Price,
		&existing.DepositFee, &existing.TradingFee, &existing.ClosingFee, &existing.TotalFees,
		&existing.Total, &existing.Notes, &existing.CreatedAt, &existing.UpdatedAt,
	)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Trade not found"})
	}

	if req.Date != nil {
		parsed, err := parseTradeDate(*req.Date)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid date format"})
		}
		existing.Date = parsed
	}
	if req.Ticker != nil {
		ticker := strings.TrimSpace(strings.ToUpper(*req.Ticker))
		if ticker == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Ticker is required"})
		}
		existing.Ticker = ticker
	}
	if req.AssetType != nil {
		if *req.AssetType != "stock" && *req.AssetType != "etf" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid asset type"})
		}
		existing.AssetType = *req.AssetType
	}
	if req.Side != nil {
		if *req.Side != "buy" && *req.Side != "sell" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid side"})
		}
		existing.Side = *req.Side
	}
	if req.IsOpeningPosition != nil {
		existing.IsOpeningPosition = *req.IsOpeningPosition
	}
	if existing.IsOpeningPosition && existing.Side != "buy" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Opening position must use buy side"})
	}
	if req.Quantity != nil {
		existing.Quantity = *req.Quantity
	}
	if req.Price != nil {
		price, err := decimal.NewFromString(*req.Price)
		if err != nil || !price.GreaterThan(decimal.Zero) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid price format"})
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
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid deposit_fee format"})
		}
	}
	if req.TradingFee != nil {
		tradingFee, err = parseOptionalFee(req.TradingFee)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid trading_fee format"})
		}
	}
	if req.ClosingFee != nil {
		closingFee, err = parseOptionalFee(req.ClosingFee)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid closing_fee format"})
		}
	}

	depositFee, tradingFee, closingFee, err = applyLegacyFeeToTrading(req.Fee, depositFee, tradingFee, closingFee)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if existing.IsOpeningPosition && depositFee.Add(tradingFee).Add(closingFee).GreaterThan(decimal.Zero) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Opening position cannot include fees"})
	}

	quantity, err := decimal.NewFromString(existing.Quantity)
	if err != nil || !quantity.GreaterThan(decimal.Zero) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid quantity format"})
	}

	if existing.Side == "sell" {
		if err := validateSellQuantity(context.Background(), userID, existing.Ticker, id, quantity); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
	}

	notes := existing.Notes
	if req.Notes != nil {
		notes = req.Notes
	}
	if existing.IsOpeningPosition && (notes == nil || strings.TrimSpace(*notes) == "") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Notes are required for opening positions"})
	}

	updateQuery := `
		UPDATE trades
		SET date = $1, ticker = $2, asset_type = $3, side = $4, is_opening_position = $5, quantity = $6,
		    price = $7, notes = $8,
		    deposit_fee = $9, trading_fee = $10, closing_fee = $11,
		    updated_at = NOW()
		WHERE id = $12 AND user_id = $13
	`

	result, err := database.GetPool().Exec(context.Background(), updateQuery,
		existing.Date, existing.Ticker, existing.AssetType, existing.Side, existing.IsOpeningPosition,
		existing.Quantity, existing.Price, notes,
		depositFee.StringFixed(2), tradingFee.StringFixed(2), closingFee.StringFixed(2),
		id, userID,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	if result.RowsAffected() == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Trade not found"})
	}

	return c.JSON(fiber.Map{"message": "Trade updated successfully"})
}

// DeleteTrade deletes a trade and linked fee cash flows created for that trade.
func DeleteTrade(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id := c.Params("id")
	ctx := context.Background()

	_, err := database.GetPool().Exec(ctx, `
		DELETE FROM cash_flows
		WHERE user_id = $1
		  AND related_trade_id = $2
		  AND type = 'fee'
		  AND related_type = 'trade'
	`, userID, id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	result, err := database.GetPool().Exec(ctx, `DELETE FROM trades WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	if result.RowsAffected() == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Trade not found"})
	}

	return c.JSON(fiber.Map{"message": "Trade deleted successfully"})
}

func scanTradeRow(rows pgx.Rows) (models.Trade, error) {
	var trade models.Trade
	err := rows.Scan(
		&trade.ID, &trade.UserID, &trade.Date, &trade.Ticker, &trade.AssetType,
		&trade.Side, &trade.IsOpeningPosition, &trade.Quantity, &trade.Price,
		&trade.DepositFee, &trade.TradingFee, &trade.ClosingFee, &trade.TotalFees,
		&trade.Total, &trade.Notes, &trade.CreatedAt, &trade.UpdatedAt,
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
