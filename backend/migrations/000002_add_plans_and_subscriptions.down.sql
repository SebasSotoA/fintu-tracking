-- Revert plan/subscription scaffolding.

DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;

DROP POLICY IF EXISTS "Users can delete their own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscription" ON subscriptions;

DROP POLICY IF EXISTS "Subscribers can view their own private plan" ON plans;
DROP POLICY IF EXISTS "Users can view public plans" ON plans;

DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS plans;

ALTER TABLE profiles
  DROP COLUMN IF EXISTS subscription_status,
  DROP COLUMN IF EXISTS plan_id;
