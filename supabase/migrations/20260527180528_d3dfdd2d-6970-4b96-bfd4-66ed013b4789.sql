
-- 1) Albums & album_posts: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Albums are viewable by everyone" ON public.albums;
CREATE POLICY "Albums viewable by authenticated"
  ON public.albums FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Album posts are viewable by everyone" ON public.album_posts;
CREATE POLICY "Album posts viewable by authenticated"
  ON public.album_posts FOR SELECT
  TO authenticated
  USING (true);

-- 2) Storage: drop the overly broad SELECT policies on private buckets.
-- Owners can still read their own folder; other reads must go through signed URLs.
DROP POLICY IF EXISTS "Anyone can view audio messages" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read audio-messages" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read message-attachments" ON storage.objects;

CREATE POLICY "Owners can read own audio-messages"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'audio-messages'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Owners can read own message-attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- 3) Notifications: restrict INSERT recipient
CREATE OR REPLACE FUNCTION public.can_notify(_actor uuid, _recipient uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _actor IS NOT NULL
    AND _recipient IS NOT NULL
    AND _actor <> _recipient
    AND (
      EXISTS (
        SELECT 1 FROM public.partner_connections pc
        WHERE (pc.requester_id = _actor AND pc.receiver_id = _recipient)
           OR (pc.requester_id = _recipient AND pc.receiver_id = _actor)
      )
      OR EXISTS (
        SELECT 1 FROM public.post_likes pl
        JOIN public.posts p ON p.id = pl.post_id
        WHERE pl.user_id = _actor AND p.user_id = _recipient
      )
      OR EXISTS (
        SELECT 1 FROM public.comments c
        JOIN public.posts p ON p.id = c.post_id
        WHERE c.user_id = _actor AND p.user_id = _recipient
      )
      OR EXISTS (
        SELECT 1 FROM public.feed_comments fc
        JOIN public.posts p ON p.id = fc.post_id
        WHERE fc.user_id = _actor AND p.user_id = _recipient
      )
      OR EXISTS (
        SELECT 1 FROM public.feed_likes fl
        JOIN public.posts p ON p.id = fl.post_id
        WHERE fl.user_id = _actor AND p.user_id = _recipient
      )
      OR public.has_role(_actor, 'admin'::public.app_role)
    )
$$;

GRANT EXECUTE ON FUNCTION public.can_notify(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert notifications to allowed recipients"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = actor_id
    AND char_length(coalesce(title, '')) <= 200
    AND char_length(coalesce(body, '')) <= 1000
    AND public.can_notify(actor_id, user_id)
  );
