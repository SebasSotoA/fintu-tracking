ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locale TEXT;
ALTER TABLE profiles ADD CONSTRAINT profiles_locale_check CHECK (locale IS NULL OR locale IN ('en', 'es'));
