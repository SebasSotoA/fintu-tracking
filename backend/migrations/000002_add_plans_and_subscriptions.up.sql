-- Add plans/subscriptions scaffolding for Milestone 1.5.
-- No live checkout: every user gets a free closed_beta subscription automatically.

-- ============================================================================
-- Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'enterprise', 'closed_beta')),
  price_monthly_usd NUMERIC(10, 2),
  price_annual_usd NUMERIC(10, 2),
  currency TEXT NOT NULL DEFAULT 'USD',
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired')),
  billing_provider TEXT NOT NULL CHECK (billing_provider IN ('manual', 'wompi', 'mercadopago', 'stripe')),
  provider_subscription_id TEXT,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

-- ============================================================================
-- Profiles extension
-- ============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan_id TEXT REFERENCES plans(id),
  ADD COLUMN IF NOT EXISTS subscription_status TEXT;

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_id ON subscriptions(provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;

-- ============================================================================
-- Seed plans
-- ============================================================================

INSERT INTO plans (id, name, description, tier, price_monthly_usd, price_annual_usd, currency, features, is_public)
VALUES
  ('closed_beta', 'Closed Beta', 'Free closed-beta access for invited Colombian users.', 'closed_beta', 0, 0, 'USD', '{"max_trades": null, "max_brokers": null, "supports_exports": false, "beta": true}'::jsonb, false),
  ('free', 'Free', 'Track one broker, one currency, up to 50 trades manually.', 'free', 0, 0, 'USD', '{"max_trades": 50, "max_brokers": 1, "supports_exports": false}'::jsonb, true),
  ('pro_monthly', 'Pro Monthly', 'Unlimited trades, multi-broker/currency, fee/FX analytics.', 'pro', 4.99, NULL, 'USD', '{"max_trades": null, "max_brokers": null, "supports_exports": true}'::jsonb, true),
  ('pro_annual', 'Pro Annual', 'Unlimited trades with annual savings.', 'pro', NULL, 39.99, 'USD', '{"max_trades": null, "max_brokers": null, "supports_exports": true}'::jsonb, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  price_monthly_usd = EXCLUDED.price_monthly_usd,
  price_annual_usd = EXCLUDED.price_annual_usd,
  currency = EXCLUDED.currency,
  features = EXCLUDED.features,
  is_public = EXCLUDED.is_public,
  updated_at = NOW();

-- ============================================================================
-- Backfill existing users with a closed_beta subscription
-- ============================================================================

INSERT INTO subscriptions (user_id, plan_id, status, billing_provider)
SELECT id, 'closed_beta', 'active', 'manual'
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Sync the denormalized profile cache from the closed_beta subscriptions we just
-- ensured. This remains idempotent across rollback/re-apply because it joins
-- against subscriptions rather than relying on plan_id IS NULL.
UPDATE profiles
SET plan_id = 'closed_beta',
    subscription_status = 'active'
WHERE user_id IN (
  SELECT s.user_id
  FROM subscriptions s
  WHERE s.plan_id = 'closed_beta'
    AND s.status = 'active'
    AND s.billing_provider = 'manual'
)
AND (
  profiles.plan_id IS DISTINCT FROM 'closed_beta'
  OR profiles.subscription_status IS DISTINCT FROM 'active'
);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- plans: public plans are readable by everyone; non-public plans are readable by their subscribers.
DROP POLICY IF EXISTS "Users can view public plans" ON plans;
CREATE POLICY "Users can view public plans"
  ON plans FOR SELECT TO authenticated
  USING (is_public = true);

DROP POLICY IF EXISTS "Subscribers can view their own private plan" ON plans;
CREATE POLICY "Subscribers can view their own private plan"
  ON plans FOR SELECT TO authenticated
  USING (
    is_public = false
    AND EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.plan_id = plans.id
        AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view their own subscription" ON subscriptions;
CREATE POLICY "Users can view their own subscription"
  ON subscriptions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own subscription" ON subscriptions;
CREATE POLICY "Users can insert their own subscription"
  ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own subscription" ON subscriptions;
CREATE POLICY "Users can update their own subscription"
  ON subscriptions FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own subscription" ON subscriptions;
CREATE POLICY "Users can delete their own subscription"
  ON subscriptions FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- Triggers
-- ============================================================================

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
