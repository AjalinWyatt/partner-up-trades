ALTER TABLE public.trading_profiles
  ADD COLUMN IF NOT EXISTS partnership_strengths text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS accountability_needs text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS communication_preferences text[] NOT NULL DEFAULT '{}';
COMMENT ON COLUMN public.trading_profiles.partnership_strengths IS 'What the trader brings to a partnership. Not used by Algo Match yet.';
COMMENT ON COLUMN public.trading_profiles.accountability_needs IS 'Where the trader wants partner accountability. Not used by Algo Match yet.';
COMMENT ON COLUMN public.trading_profiles.communication_preferences IS 'How the trader prefers to communicate (separate from connect_frequency). Not used by Algo Match yet.';