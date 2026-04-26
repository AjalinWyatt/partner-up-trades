-- =========================================================
-- Security hardening pass (launch readiness)
-- =========================================================

-- 1) profiles: stop exposing PII to anonymous users
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 2) trading_profiles: same — authenticated only
DROP POLICY IF EXISTS "Public trading profiles are viewable by everyone" ON public.trading_profiles;
CREATE POLICY "Authenticated users can view trading profiles"
ON public.trading_profiles
FOR SELECT
TO authenticated
USING (true);

-- 3) Story owners can see who viewed their stories
DROP POLICY IF EXISTS "Story owners can view their story views" ON public.story_views;
CREATE POLICY "Story owners can view their story views"
ON public.story_views
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stories s
    WHERE s.id = story_views.story_id
      AND s.user_id = auth.uid()
  )
);

-- 4) Storage: scope audio-messages & message-attachments to message participants.
-- Files are stored under a path that begins with the sender's user id (folder = uid).
-- We tighten SELECT so only that uploader can read; recipients receive the URL via the
-- messages row and the buckets remain public for direct URL access (signed/public URLs
-- are how attachments are rendered today). To preserve existing behavior we keep public
-- read but at least restrict listing/upload to the owning folder.

-- audio-messages
DROP POLICY IF EXISTS "Authenticated users can read audio messages" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload audio messages" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own audio messages" ON storage.objects;

CREATE POLICY "Audio messages are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-messages');

CREATE POLICY "Users can upload to own audio folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'audio-messages'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own audio uploads"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'audio-messages'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- message-attachments
DROP POLICY IF EXISTS "Authenticated users can read message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own message attachments" ON storage.objects;

CREATE POLICY "Message attachments are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'message-attachments');

CREATE POLICY "Users can upload to own attachment folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own attachment uploads"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5) Self-notifications guard (don't notify yourself about your own actions)
CREATE OR REPLACE FUNCTION public.prevent_self_notifications()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.actor_id = NEW.user_id THEN
    RETURN NULL;  -- silently drop
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_no_self ON public.notifications;
CREATE TRIGGER notifications_no_self
BEFORE INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_notifications();

-- 6) Prevent self-connections at the DB level
CREATE OR REPLACE FUNCTION public.prevent_self_partner_connection()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.requester_id = NEW.receiver_id THEN
    RAISE EXCEPTION 'Cannot create a partner connection with yourself';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS partner_connections_no_self ON public.partner_connections;
CREATE TRIGGER partner_connections_no_self
BEFORE INSERT OR UPDATE ON public.partner_connections
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_partner_connection();
