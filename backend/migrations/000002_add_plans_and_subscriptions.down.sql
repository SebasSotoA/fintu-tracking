-- Revert plan/subscription scaffolding.
-- WARNING: destructive rollback. Only run in development/CI.

DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;

DROP POLICY IF EXISTS "Users can delete their own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscription" ON subscriptions;

DROP POLICY IF EXISTS "Subscribers can view their own private plan" ON plans;
DROP POLICY IF EXISTS "Users can view public plans" ON plans;

-- Remove the denormalized profile cache columns before dropping the referenced tables
-- so the foreign-key constraint is released in the correct order.
ALTER TABLE profiles
  DROP COLUMN IF EXISTS subscription_status,
  DROP COLUMN IF EXISTS plan_id;

DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS plans;
