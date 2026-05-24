-- ============================================================
-- 1. Profiles: revoke sensitive cols + add self-only RPC
-- ============================================================
REVOKE SELECT (date_of_birth, notify_email, notify_partner_activity, notify_new_matches, notify_messages, username_changes_count)
  ON public.profiles FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_my_private_profile()
RETURNS TABLE (
  date_of_birth date,
  notify_email boolean,
  notify_partner_activity boolean,
  notify_new_matches boolean,
  notify_messages boolean,
  username_changes_count integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT date_of_birth, notify_email, notify_partner_activity,
         notify_new_matches, notify_messages, username_changes_count
  FROM public.profiles
  WHERE id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_private_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_private_profile() TO authenticated;

-- Age helper view (only exposes id + computed age, not dob itself)
CREATE OR REPLACE VIEW public.profile_ages
WITH (security_invoker = off) AS
SELECT
  id,
  CASE WHEN date_of_birth IS NOT NULL
    THEN EXTRACT(YEAR FROM age(date_of_birth))::int
    ELSE NULL
  END AS age
FROM public.profiles;

REVOKE ALL ON public.profile_ages FROM PUBLIC, anon;
GRANT SELECT ON public.profile_ages TO authenticated;

-- ============================================================
-- 2. Storage: make message buckets private + restrict access
-- ============================================================
UPDATE storage.buckets SET public = false
  WHERE id IN ('audio-messages', 'message-attachments');

-- Drop any existing permissive policies for these buckets
DROP POLICY IF EXISTS "Audio messages public read" ON storage.objects;
DROP POLICY IF EXISTS "Message attachments public read" ON storage.objects;

CREATE POLICY "Authenticated can read audio-messages"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'audio-messages');

CREATE POLICY "Authenticated can upload audio-messages to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'audio-messages'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own audio-messages"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'audio-messages'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated can read message-attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'message-attachments');

CREATE POLICY "Authenticated can upload message-attachments to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own message-attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- 3. Realtime: baseline RLS denying anonymous subscriptions
-- ============================================================
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated only realtime" ON realtime.messages;
CREATE POLICY "Authenticated only realtime"
  ON realtime.messages FOR SELECT TO authenticated
  USING (true);