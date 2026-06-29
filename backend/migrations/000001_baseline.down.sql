-- Roll back the entire baseline. This drops all tables, views, and functions
-- created by the baseline migration and is intended for local/CI resets only.

DROP VIEW IF EXISTS fee_reconciliation_summary;
DROP VIEW IF EXISTS orphaned_fee_cash_flows;

DROP TRIGGER IF EXISTS update_fee_cash_flows_after_trade_update ON trades;
DROP TRIGGER IF EXISTS create_fee_cash_flows_after_trade ON trades;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_brokers_updated_at ON brokers;
DROP TRIGGER IF EXISTS update_fx_rates_updated_at ON fx_rates;
DROP TRIGGER IF EXISTS update_trades_updated_at ON trades;
DROP TRIGGER IF EXISTS update_cash_flows_updated_at ON cash_flows;

DROP FUNCTION IF EXISTS get_user_available_cash(UUID);
DROP FUNCTION IF EXISTS get_user_fees_by_type(UUID);
DROP FUNCTION IF EXISTS get_user_total_fees(UUID);
DROP FUNCTION IF EXISTS update_fee_cash_flows_for_trade();
DROP FUNCTION IF EXISTS create_fee_cash_flows_for_trade();
DROP FUNCTION IF EXISTS update_updated_at_column();

DROP TABLE IF EXISTS cash_flows CASCADE;
DROP TABLE IF EXISTS trades CASCADE;
DROP TABLE IF EXISTS brokers CASCADE;
DROP TABLE IF EXISTS fx_rates CASCADE;
DROP TABLE IF EXISTS market_prices CASCADE;
DROP TABLE IF EXISTS market_price_refresh_log CASCADE;
DROP TABLE IF EXISTS portfolio_snapshots CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
