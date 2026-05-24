
-- 1. Waitlist: replace `true` insert policy with validation
DROP POLICY IF EXISTS "Anyone can insert into waitlist" ON public.waitlist;
CREATE POLICY "Anyone can join waitlist with valid email"
  ON public.waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND length(email) BETWEEN 5 AND 254
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  );

-- 2. Storage: drop broad list-enabling SELECT policies on public buckets.
-- Public buckets still serve files via the public CDN URL without RLS.
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view post images" ON storage.objects;

-- 3. SECURITY DEFINER function exposure
-- Default: revoke from anon + authenticated, then re-grant only what end-users actually call.
REVOKE EXECUTE ON FUNCTION public.set_updated_at_timestamp() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_self_partner_connection() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_self_notifications() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_system_message_rules() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_voice_room_activity() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_birth_year() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_beta_key(text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_inactive_voice_rooms() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_stale_pulse_requests() FROM anon, authenticated;

-- Functions end users (authenticated) legitimately call: revoke anon only.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_partner_checkin_streak(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.touch_presence() FROM anon;

-- verify_beta_key is invoked from the signup gate before auth; keep anon, revoke authed.
REVOKE EXECUTE ON FUNCTION public.verify_beta_key(text) FROM authenticated;
