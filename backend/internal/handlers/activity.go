package handlers

import (
	"fmt"
	"fintu-tracking-backend/internal/config"
	"fintu-tracking-backend/internal/database"
	"fintu-tracking-backend/internal/middleware"
	"fintu-tracking-backend/internal/models"
	"strconv"

	"github.com/gofiber/fiber/v3"
)

// GetActivityFeed handles GET /api/activity/feed
// Returns a unified feed of recent trades and cash flows, ordered by date DESC.
// Query param: limit (default 8, max 20).
func GetActivityFeed(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	limit := 8
	if limitStr := c.Query("limit"); limitStr != "" {
		if n, err := strconv.Atoi(limitStr); err == nil && n > 0 && n <= 20 {
			limit = n
		}
	}

	query := fmt.Sprintf(`
		SELECT id, date, kind, sub_kind, ticker, direction, amount_usd, details
		FROM (
			(SELECT
				id,
				date,
				'trade' AS kind,
				side AS sub_kind,
				ticker,
				CASE WHEN side = 'buy' THEN 'out' ELSE 'in' END AS direction,
				ABS(total)::text AS amount_usd,
				side || ' ' || quantity || ' ' || ticker || ' @ $' || price AS details
			FROM trades
			WHERE user_id = $1
			ORDER BY date DESC
			LIMIT $2)

			UNION ALL

			(SELECT
				id,
				date,
				CASE
					WHEN type = 'fee' AND related_type = 'trade' THEN 'fee'
					ELSE type
				END AS kind,
				COALESCE(fee_type, '') AS sub_kind,
				'' AS ticker,
				CASE
					WHEN type = 'deposit' OR type = 'cash_adjustment' THEN 'in'
					ELSE 'out'
				END AS direction,
				ABS(usd_amount)::text AS amount_usd,
				CASE
					WHEN type = 'deposit' THEN 'Deposit: %s ' || amount
					WHEN type = 'withdrawal' THEN 'Withdrawal: %s ' || amount
					WHEN type = 'cash_adjustment' THEN 'Cash adjustment: $' || usd_amount
					WHEN type = 'fee' THEN 'Fee (' || COALESCE(fee_type, 'other') || '): $' || usd_amount
					ELSE type || ': $' || usd_amount
				END AS details
			FROM cash_flows
			WHERE user_id = $1
			ORDER BY date DESC
			LIMIT $2)
		) AS feed
		ORDER BY date DESC
		LIMIT $2
	`, config.LocalCurrency, config.LocalCurrency)

	rows, err := database.GetPool().Query(c.Context(), query, userID, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	items := make([]models.ActivityItem, 0, limit)
	for rows.Next() {
		var item models.ActivityItem
		if err := rows.Scan(&item.ID, &item.Date, &item.Kind, &item.SubKind, &item.Ticker, &item.Direction, &item.AmountUSD, &item.Details); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		items = append(items, item)
	}

	return c.JSON(items)
}
