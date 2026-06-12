package services

func returnAttributionHoldingsSQL() string {
	return `
		SELECT 
			t.ticker,
			SUM(CASE WHEN t.side = 'buy' THEN t.quantity ELSE -t.quantity END) as net_quantity,
			SUM(CASE WHEN t.side = 'buy' THEN (t.quantity * t.price + COALESCE(t.total_fees, 0)) ELSE 0 END) as total_cost,
			COALESCE(mp.price, (
				SELECT t2.price 
				FROM trades t2 
				WHERE t2.ticker = t.ticker AND t2.user_id = $1
				ORDER BY t2.date DESC, t2.created_at DESC 
				LIMIT 1
			)) as current_price
		FROM trades t
		LEFT JOIN market_prices mp ON t.ticker = mp.ticker
		WHERE t.user_id = $1
		GROUP BY t.ticker, mp.price
		HAVING SUM(CASE WHEN t.side = 'buy' THEN t.quantity ELSE -t.quantity END) > 0
	`
}

func netWorthHoldingsSQL() string {
	return `
		SELECT 
			t.ticker,
			t.asset_type,
			SUM(CASE WHEN t.side = 'buy' THEN t.quantity ELSE -t.quantity END) as net_quantity,
			SUM(CASE WHEN t.side = 'buy' THEN (t.quantity * t.price + COALESCE(t.total_fees, 0)) ELSE -(t.quantity * t.price - COALESCE(t.total_fees, 0)) END) as cost_basis,
			SUM(CASE WHEN t.side = 'buy' THEN COALESCE(t.total_fees, 0) ELSE 0 END) as total_fees,
			COALESCE(mp.price, (
				SELECT t2.price 
				FROM trades t2 
				WHERE t2.ticker = t.ticker AND t2.user_id = $1
				ORDER BY t2.date DESC, t2.created_at DESC 
				LIMIT 1
			)) as current_price
		FROM trades t
		LEFT JOIN market_prices mp ON t.ticker = mp.ticker
		WHERE t.user_id = $1
		GROUP BY t.ticker, t.asset_type, mp.price
		HAVING SUM(CASE WHEN t.side = 'buy' THEN t.quantity ELSE -t.quantity END) > 0
	`
}

func performanceTradeLoadSQL() string {
	return `
		SELECT date, side, ticker, quantity, price, COALESCE(total_fees, 0), COALESCE(is_opening_position, false)
		FROM trades
		WHERE user_id = $1
		ORDER BY date ASC
	`
}
