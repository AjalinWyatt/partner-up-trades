
-- 1) Presence: last_seen_at on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at ON public.profiles (last_seen_at DESC);

-- Authed users can bump their own presence cheaply.
CREATE OR REPLACE FUNCTION public.touch_presence()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles SET last_seen_at = now() WHERE id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.touch_presence() FROM anon;
GRANT EXECUTE ON FUNCTION public.touch_presence() TO authenticated;

-- 2) Cron: expire stale Pulse requests every minute
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule existing copy (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('expire-stale-pulse-requests');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'expire-stale-pulse-requests',
  '* * * * *',
  $$ SELECT public.expire_stale_pulse_requests(); $$
);
