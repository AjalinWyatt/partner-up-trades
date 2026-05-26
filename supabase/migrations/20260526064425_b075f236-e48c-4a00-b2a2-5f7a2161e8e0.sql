
-- 1. Drop public-role SELECT on private storage buckets
DROP POLICY IF EXISTS "Audio messages are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Message attachments are publicly readable" ON storage.objects;

-- 2. Re-revoke date_of_birth column access from non-owners (a prior migration re-granted it).
REVOKE SELECT (date_of_birth) ON public.profiles FROM anon, authenticated;
-- Owners can still read it via a column grant scoped through RLS: easiest path is a SECURITY DEFINER helper.
CREATE OR REPLACE FUNCTION public.get_own_date_of_birth()
RETURNS date
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT date_of_birth FROM public.profiles WHERE id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.get_own_date_of_birth() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_own_date_of_birth() TO authenticated;

-- 3. Lock down internal SECURITY DEFINER functions that should not be callable by clients.
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.expire_stale_pulse_requests() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.cleanup_inactive_voice_rooms() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_beta_key(text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.bump_voice_room_activity() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.prevent_self_notifications() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.prevent_self_partner_connection() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.enforce_system_message_rules() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_updated_at_timestamp() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_birth_year() FROM anon, authenticated, public;
