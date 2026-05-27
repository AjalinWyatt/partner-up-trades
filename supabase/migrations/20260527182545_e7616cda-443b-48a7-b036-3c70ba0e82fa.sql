
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hidden_from_discover boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_hidden_from_discover
  ON public.profiles (hidden_from_discover)
  WHERE hidden_from_discover = false;
