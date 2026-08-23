package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"fintu-tracking-backend/internal/config"
	"fintu-tracking-backend/internal/database"
	"fintu-tracking-backend/internal/httpx"
	"fintu-tracking-backend/internal/middleware"
	"fintu-tracking-backend/internal/models"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"
)

const cashFlowListColumns = `
	id, user_id, date, type, currency, amount, fx_rate, usd_amount, broker_id, notes,
	fee_type, related_trade_id, related_cash_flow_id, related_type, created_at, updated_at
`

// ListCashFlows returns cash flows for the authenticated user.
// Without page/page_size query params, returns a plain JSON array (legacy).
// With page or page_size, returns models.PaginatedResponse.
func ListCashFlows(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	filters, err := parseCashFlowListFilters(
		r.URL.Query().Get("from"),
		r.URL.Query().Get("to"),
		r.URL.Query().Get("type"),
		r.URL.Query().Get("currency"),
		r.URL.Query().Get("exclude_mirrored"),
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
		countQuery, countArgs := buildCountCashFlowsQuery(userID, filters)
		if err := database.GetPool().QueryRow(context.Background(), countQuery, countArgs...).Scan(&total); err != nil {
			httpx.Error(w, http.StatusInternalServerError, err.Error())
			return
		}
		page = clampPage(page, total, pageSize)
		offset = (page - 1) * pageSize
	}

	query, args := buildListCashFlowsQuery(userID, filters, limit, offset)

	rows, err := database.GetPool().Query(context.Background(), query, args...)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	cashFlows := make([]models.CashFlow, 0)
	for rows.Next() {
		var cf models.CashFlow
		if err := scanCashFlowListRow(rows, &cf); err != nil {
			httpx.Error(w, http.StatusInternalServerError, err.Error())
			return
		}
		cashFlows = append(cashFlows, cf)
	}

	if limit > 0 {
		httpx.JSON(w, http.StatusOK, models.PaginatedResponse[models.CashFlow]{
			Items:    cashFlows,
			Total:    total,
			Page:     page,
			PageSize: pageSize,
		})
		return
	}

	httpx.JSON(w, http.StatusOK, cashFlows)
}

type cashFlowScanner interface {
	Scan(dest ...any) error
}

func scanCashFlowRow(row cashFlowScanner, cf *models.CashFlow) error {
	return row.Scan(
		&cf.ID, &cf.UserID, &cf.Date, &cf.Type, &cf.Currency, &cf.Amount, &cf.FxRate, &cf.UsdAmount,
		&cf.BrokerID, &cf.Notes, &cf.FeeType, &cf.RelatedTradeID, &cf.RelatedCashFlowID, &cf.RelatedType,
		&cf.CreatedAt, &cf.UpdatedAt,
	)
}

func scanCashFlowListRow(row cashFlowScanner, cf *models.CashFlow) error {
	return scanCashFlowRow(row, cf)
}

// CreateCashFlow creates a new cash flow
func CreateCashFlow(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req models.CreateCashFlowRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if !isValidCashFlowType(req.Type) {
		httpx.Error(w, http.StatusBadRequest, "Invalid type")
		return
	}
	if !isValidCashFlowCurrency(req.Currency) {
		httpx.Error(w, http.StatusBadRequest, "Invalid currency")
		return
	}
	if (req.Type == "deposit" || req.Type == "withdrawal") && req.Currency != config.LocalCurrency {
		httpx.Error(w, http.StatusBadRequest, fmt.Sprintf("Deposits and withdrawals must use %s", config.LocalCurrency))
		return
	}
	if req.Type == "cash_adjustment" {
		if req.Currency != config.BaseCurrency {
			httpx.Error(w, http.StatusBadRequest, fmt.Sprintf("Cash adjustments must use %s", config.BaseCurrency))
			return
		}
		if req.Notes == nil || strings.TrimSpace(*req.Notes) == "" {
			httpx.Error(w, http.StatusBadRequest, "Notes are required for cash adjustments")
			return
		}
	}
	if err := validateFeeLinkage(req.Type, req.RelatedCashFlowID, req.RelatedTradeID); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := validateBrokerID(r.Context(), userID, req.BrokerID); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	amount, err := decimal.NewFromString(req.Amount)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid amount format")
		return
	}

	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid date format")
		return
	}

	var fxRate *decimal.Decimal
	if req.Currency == config.LocalCurrency {
		if req.FxRate == nil || *req.FxRate == "" {
			httpx.Error(w, http.StatusBadRequest, fmt.Sprintf("FX rate required for %s transactions", config.LocalCurrency))
			return
		}
		rate, err := decimal.NewFromString(*req.FxRate)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "Invalid FX rate format")
			return
		}
		fxRate = &rate
	}

	grossUsd, err := computeGrossUsd(req.Currency, amount, fxRate)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	usdAmount := grossUsd

	id := uuid.New().String()

	query := `
		INSERT INTO cash_flows (id, user_id, date, type, currency, amount, fx_rate, usd_amount, broker_id, notes, fee_type, related_trade_id, related_cash_flow_id, related_type)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING ` + cashFlowListColumns + `
	`

	var cashFlow models.CashFlow
	var fxRateStr *string
	if fxRate != nil {
		s := fxRate.String()
		fxRateStr = &s
	}

	err = database.GetPool().QueryRow(context.Background(), query,
		id, userID, date, req.Type, req.Currency, req.Amount, fxRateStr, usdAmount.String(), req.BrokerID, req.Notes,
		req.FeeType, req.RelatedTradeID, req.RelatedCashFlowID, req.RelatedType).
		Scan(
			&cashFlow.ID, &cashFlow.UserID, &cashFlow.Date, &cashFlow.Type, &cashFlow.Currency,
			&cashFlow.Amount, &cashFlow.FxRate, &cashFlow.UsdAmount, &cashFlow.BrokerID, &cashFlow.Notes,
			&cashFlow.FeeType, &cashFlow.RelatedTradeID, &cashFlow.RelatedCashFlowID, &cashFlow.RelatedType,
			&cashFlow.CreatedAt, &cashFlow.UpdatedAt,
		)

	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	if req.Type == "fee" && req.RelatedCashFlowID != nil {
		if err := recomputeTransferNetUSD(context.Background(), *req.RelatedCashFlowID, userID); err != nil {
			httpx.Error(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	httpx.JSON(w, http.StatusCreated, cashFlow)
}

// UpdateCashFlow updates an existing cash flow
func UpdateCashFlow(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	var req models.UpdateCashFlowRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	var existingCF models.CashFlow
	query := `SELECT date, type, currency, amount, fx_rate, broker_id, fee_type, related_trade_id, related_cash_flow_id, related_type FROM cash_flows WHERE id = $1 AND user_id = $2`
	err := database.GetPool().QueryRow(context.Background(), query, id, userID).
		Scan(&existingCF.Date, &existingCF.Type, &existingCF.Currency, &existingCF.Amount, &existingCF.FxRate,
			&existingCF.BrokerID, &existingCF.FeeType, &existingCF.RelatedTradeID, &existingCF.RelatedCashFlowID, &existingCF.RelatedType)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "Cash flow not found")
		return
	}

	originalType := existingCF.Type
	originalRelatedParentID := existingCF.RelatedCashFlowID

	if req.Date != nil {
		parsedDate, err := time.Parse("2006-01-02", *req.Date)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "Invalid date format")
			return
		}
		existingCF.Date = parsedDate
	}
	if req.Type != nil {
		if !isValidCashFlowType(*req.Type) {
			httpx.Error(w, http.StatusBadRequest, "Invalid type")
			return
		}
		existingCF.Type = *req.Type
	}
	if req.Currency != nil {
		if !isValidCashFlowCurrency(*req.Currency) {
			httpx.Error(w, http.StatusBadRequest, "Invalid currency")
			return
		}
		existingCF.Currency = *req.Currency
	}
	if req.Amount != nil {
		existingCF.Amount = *req.Amount
	}
	if req.FxRate != nil {
		existingCF.FxRate = req.FxRate
	}
	if req.BrokerID != nil {
		existingCF.BrokerID = req.BrokerID
	}
	if req.FeeType != nil {
		existingCF.FeeType = req.FeeType
	}
	if req.Notes != nil {
		existingCF.Notes = req.Notes
	}
	if req.RelatedTradeID != nil {
		existingCF.RelatedTradeID = req.RelatedTradeID
	}
	if req.RelatedCashFlowID != nil {
		existingCF.RelatedCashFlowID = req.RelatedCashFlowID
	}
	if req.RelatedType != nil {
		existingCF.RelatedType = req.RelatedType
	}

	if err := validateBrokerID(r.Context(), userID, existingCF.BrokerID); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	if (existingCF.Type == "deposit" || existingCF.Type == "withdrawal") && existingCF.Currency != config.LocalCurrency {
		httpx.Error(w, http.StatusBadRequest, fmt.Sprintf("Deposits and withdrawals must use %s", config.LocalCurrency))
		return
	}
	if existingCF.Type == "cash_adjustment" {
		if existingCF.Currency != config.BaseCurrency {
			httpx.Error(w, http.StatusBadRequest, fmt.Sprintf("Cash adjustments must use %s", config.BaseCurrency))
			return
		}
		if existingCF.Notes == nil || strings.TrimSpace(*existingCF.Notes) == "" {
			httpx.Error(w, http.StatusBadRequest, "Notes are required for cash adjustments")
			return
		}
	}
	if err := validateFeeLinkage(existingCF.Type, existingCF.RelatedCashFlowID, existingCF.RelatedTradeID); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	amount, err := decimal.NewFromString(existingCF.Amount)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid amount format")
		return
	}
	var fxRateDec *decimal.Decimal
	if existingCF.Currency == config.LocalCurrency {
		if existingCF.FxRate == nil {
			httpx.Error(w, http.StatusBadRequest, fmt.Sprintf("FX rate required for %s", config.LocalCurrency))
			return
		}
		rate, err := decimal.NewFromString(*existingCF.FxRate)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "Invalid FX rate format")
			return
		}
		fxRateDec = &rate
	}

	grossUsd, err := computeGrossUsd(existingCF.Currency, amount, fxRateDec)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	usdAmount := grossUsd
	if isTransferParentType(existingCF.Type) {
		linkedFeesSum, err := sumLinkedTransferFeesUSD(context.Background(), id)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, err.Error())
			return
		}
		usdAmount = computeNetTransferUsd(grossUsd, []decimal.Decimal{linkedFeesSum})
	}

	updateQuery := `
		UPDATE cash_flows
		SET date = $1, type = $2, currency = $3, amount = $4, fx_rate = $5, usd_amount = $6, broker_id = $7, notes = $8,
			fee_type = $9, related_trade_id = $10, related_cash_flow_id = $11, related_type = $12, updated_at = NOW()
		WHERE id = $13 AND user_id = $14
	`

	result, err := database.GetPool().Exec(context.Background(), updateQuery,
		existingCF.Date, existingCF.Type, existingCF.Currency, existingCF.Amount,
		existingCF.FxRate, usdAmount.String(), existingCF.BrokerID, existingCF.Notes,
		existingCF.FeeType, existingCF.RelatedTradeID, existingCF.RelatedCashFlowID, existingCF.RelatedType,
		id, userID)

	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	if result.RowsAffected() == 0 {
		httpx.Error(w, http.StatusNotFound, "Cash flow not found")
		return
	}

	if isTransferParentType(existingCF.Type) {
		if err := recomputeTransferNetUSD(context.Background(), id, userID); err != nil {
			httpx.Error(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	if originalType == "fee" || existingCF.Type == "fee" {
		parents := make(map[string]struct{})
		if originalType == "fee" && originalRelatedParentID != nil {
			parents[*originalRelatedParentID] = struct{}{}
		}
		if existingCF.Type == "fee" && existingCF.RelatedCashFlowID != nil {
			parents[*existingCF.RelatedCashFlowID] = struct{}{}
		}
		for parentID := range parents {
			if err := recomputeTransferNetUSD(context.Background(), parentID, userID); err != nil {
				httpx.Error(w, http.StatusInternalServerError, err.Error())
				return
			}
		}
	}

	httpx.JSON(w, http.StatusOK, map[string]any{"message": "Cash flow updated successfully"})
}

// DeleteCashFlow deletes a cash flow
func DeleteCashFlow(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id := chi.URLParam(r, "id")

	var flowType string
	var relatedParentID *string
	err := database.GetPool().QueryRow(context.Background(),
		`SELECT type, related_cash_flow_id FROM cash_flows WHERE id = $1 AND user_id = $2`, id, userID).
		Scan(&flowType, &relatedParentID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	query := `DELETE FROM cash_flows WHERE id = $1 AND user_id = $2`
	result, err := database.GetPool().Exec(context.Background(), query, id, userID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, fmt.Sprintf("Error: %v", err))
		return
	}

	if result.RowsAffected() == 0 {
		httpx.Error(w, http.StatusNotFound, "Cash flow not found")
		return
	}

	if flowType == "fee" && relatedParentID != nil {
		if err := recomputeTransferNetUSD(context.Background(), *relatedParentID, userID); err != nil {
			httpx.Error(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	httpx.JSON(w, http.StatusOK, map[string]any{"message": "Cash flow deleted successfully"})
}

func isValidCashFlowType(flowType string) bool {
	return flowType == "deposit" || flowType == "withdrawal" || flowType == "fee" || flowType == "cash_adjustment"
}

func isValidCashFlowCurrency(currency string) bool {
	return currency == config.BaseCurrency || currency == config.LocalCurrency
}

func validateFeeLinkage(flowType string, relatedCashFlowID *string, relatedTradeID *string) error {
	if flowType == "fee" && relatedCashFlowID == nil && relatedTradeID == nil {
		return fmt.Errorf("Standalone fees are not supported; fees must be linked to a deposit, withdrawal, or trade")
	}
	return nil
}

func validateBrokerID(ctx context.Context, userID string, brokerID *string) error {
	if brokerID == nil || *brokerID == "" {
		return nil
	}

	var found bool
	err := database.GetPool().QueryRow(ctx,
		`SELECT true FROM brokers WHERE id = $1 AND user_id = $2`, *brokerID, userID,
	).Scan(&found)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("invalid broker_id")
		}
		return fmt.Errorf("validating broker: %w", err)
	}
	return nil
}