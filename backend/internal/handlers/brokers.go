package handlers

import (
	"context"
	"fintu-tracking-backend/internal/database"
	"fintu-tracking-backend/internal/models"
	
	"github.com/gofiber/fiber/v3"
)

// CreateBroker handles POST /api/brokers
func CreateBroker(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req models.CreateBrokerRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate required fields
	if req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Broker name is required",
		})
	}

	// Set defaults
	depositFeePct := "0"
	if req.DefaultDepositFeePct != nil {
		depositFeePct = *req.DefaultDepositFeePct
	}

	tradingFeePct := "0"
	if req.DefaultTradingFeePct != nil {
		tradingFeePct = *req.DefaultTradingFeePct
	}

	closingFeePct := "0"
	if req.DefaultClosingFeePct != nil {
		closingFeePct = *req.DefaultClosingFeePct
	}

	maintenanceFee := "0"
	if req.DefaultMaintenanceFee != nil {
		maintenanceFee = *req.DefaultMaintenanceFee
	}

	feeMethod := "percentage"
	if req.FeeCalculationMethod != nil {
		feeMethod = *req.FeeCalculationMethod
	}

	// Insert broker
	var broker models.Broker
	err := database.GetPool().QueryRow(context.Background(), `
		INSERT INTO brokers (
			user_id, name, default_deposit_fee_pct, default_trading_fee_pct, 
			default_closing_fee_pct, default_maintenance_fee, fee_calculation_method
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, user_id, name, default_deposit_fee_pct, default_trading_fee_pct, 
				  default_closing_fee_pct, default_maintenance_fee, fee_calculation_method, 
				  created_at, updated_at
	`, userID, req.Name, depositFeePct, tradingFeePct, closingFeePct, maintenanceFee, feeMethod).Scan(
		&broker.ID,
		&broker.UserID,
		&broker.Name,
		&broker.DefaultDepositFeePct,
		&broker.DefaultTradingFeePct,
		&broker.DefaultClosingFeePct,
		&broker.DefaultMaintenanceFee,
		&broker.FeeCalculationMethod,
		&broker.CreatedAt,
		&broker.UpdatedAt,
	)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create broker: " + err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(broker)
}

// GetBrokers handles GET /api/brokers
func GetBrokers(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	rows, err := database.GetPool().Query(context.Background(), `
		SELECT id, user_id, name, default_deposit_fee_pct, default_trading_fee_pct, 
			   default_closing_fee_pct, default_maintenance_fee, fee_calculation_method, 
			   created_at, updated_at
		FROM brokers
		WHERE user_id = $1
		ORDER BY name ASC
	`, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch brokers",
		})
	}
	defer rows.Close()

	brokers := []models.Broker{}
	for rows.Next() {
		var broker models.Broker
		err := rows.Scan(
			&broker.ID,
			&broker.UserID,
			&broker.Name,
			&broker.DefaultDepositFeePct,
			&broker.DefaultTradingFeePct,
			&broker.DefaultClosingFeePct,
			&broker.DefaultMaintenanceFee,
			&broker.FeeCalculationMethod,
			&broker.CreatedAt,
			&broker.UpdatedAt,
		)
		if err != nil {
			continue
		}
		brokers = append(brokers, broker)
	}

	return c.JSON(brokers)
}

// GetBroker handles GET /api/brokers/:id
func GetBroker(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	brokerID := c.Params("id")

	var broker models.Broker
	err := database.GetPool().QueryRow(context.Background(), `
		SELECT id, user_id, name, default_deposit_fee_pct, default_trading_fee_pct, 
			   default_closing_fee_pct, default_maintenance_fee, fee_calculation_method, 
			   created_at, updated_at
		FROM brokers
		WHERE id = $1 AND user_id = $2
	`, brokerID, userID).Scan(
		&broker.ID,
		&broker.UserID,
		&broker.Name,
		&broker.DefaultDepositFeePct,
		&broker.DefaultTradingFeePct,
		&broker.DefaultClosingFeePct,
		&broker.DefaultMaintenanceFee,
		&broker.FeeCalculationMethod,
		&broker.CreatedAt,
		&broker.UpdatedAt,
	)

	if err != nil && err.Error() == "no rows in result set" {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Broker not found",
		})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch broker",
		})
	}

	return c.JSON(broker)
}

// UpdateBroker handles PUT /api/brokers/:id
func UpdateBroker(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	brokerID := c.Params("id")

	var req models.UpdateBrokerRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Build dynamic update query
	updates := []string{}
	args := []interface{}{}
	argCount := 0

	if req.Name != nil {
		argCount++
		updates = append(updates, "name = $"+string(rune('0'+argCount)))
		args = append(args, *req.Name)
	}
	if req.DefaultDepositFeePct != nil {
		argCount++
		updates = append(updates, "default_deposit_fee_pct = $"+string(rune('0'+argCount)))
		args = append(args, *req.DefaultDepositFeePct)
	}
	if req.DefaultTradingFeePct != nil {
		argCount++
		updates = append(updates, "default_trading_fee_pct = $"+string(rune('0'+argCount)))
		args = append(args, *req.DefaultTradingFeePct)
	}
	if req.DefaultClosingFeePct != nil {
		argCount++
		updates = append(updates, "default_closing_fee_pct = $"+string(rune('0'+argCount)))
		args = append(args, *req.DefaultClosingFeePct)
	}
	if req.DefaultMaintenanceFee != nil {
		argCount++
		updates = append(updates, "default_maintenance_fee = $"+string(rune('0'+argCount)))
		args = append(args, *req.DefaultMaintenanceFee)
	}
	if req.FeeCalculationMethod != nil {
		argCount++
		updates = append(updates, "fee_calculation_method = $"+string(rune('0'+argCount)))
		args = append(args, *req.FeeCalculationMethod)
	}

	if len(updates) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No fields to update",
		})
	}

	query := "UPDATE brokers SET updated_at = NOW()"
	for _, update := range updates {
		query += ", " + update
	}
	
	argCount++
	query += " WHERE id = $" + string(rune('0'+argCount))
	args = append(args, brokerID)
	
	argCount++
	query += " AND user_id = $" + string(rune('0'+argCount))
	args = append(args, userID)
	
	query += " RETURNING id, user_id, name, default_deposit_fee_pct, default_trading_fee_pct, default_closing_fee_pct, default_maintenance_fee, fee_calculation_method, created_at, updated_at"

	var broker models.Broker
	err := database.GetPool().QueryRow(context.Background(), query, args...).Scan(
		&broker.ID,
		&broker.UserID,
		&broker.Name,
		&broker.DefaultDepositFeePct,
		&broker.DefaultTradingFeePct,
		&broker.DefaultClosingFeePct,
		&broker.DefaultMaintenanceFee,
		&broker.FeeCalculationMethod,
		&broker.CreatedAt,
		&broker.UpdatedAt,
	)

	if err != nil && err.Error() == "no rows in result set" {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Broker not found",
		})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update broker: " + err.Error(),
		})
	}

	return c.JSON(broker)
}

// DeleteBroker handles DELETE /api/brokers/:id
func DeleteBroker(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	brokerID := c.Params("id")

	result, err := database.GetPool().Exec(context.Background(), `
		DELETE FROM brokers
		WHERE id = $1 AND user_id = $2
	`, brokerID, userID)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete broker",
		})
	}

	if result.RowsAffected() == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Broker not found",
		})
	}

	return c.SendStatus(fiber.StatusNoContent)
}
