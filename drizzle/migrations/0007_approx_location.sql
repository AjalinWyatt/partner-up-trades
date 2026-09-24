ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approx_lat numeric(6,1), ADD COLUMN IF NOT EXISTS approx_lng numeric(6,1), ADD COLUMN IF NOT EXISTS location_updated_at timestamptz;
COMMENT ON COLUMN public.profiles.approx_lat IS 'Approximate latitude snapped to a 0.1 degree (~7 mile) grid. Never precise GPS.';
COMMENT ON COLUMN public.profiles.approx_lng IS 'Approximate longitude snapped to a 0.1 degree grid. Never precise GPS.';
COMMENT ON COLUMN public.profiles.map_precision IS 'DEPRECATED: pin precision setting removed; fixed approximate jitter used.';