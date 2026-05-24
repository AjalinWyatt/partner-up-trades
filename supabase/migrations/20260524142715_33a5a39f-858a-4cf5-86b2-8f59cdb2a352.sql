-- Hard-delete inactive voice rooms (and their messages via cascade)
CREATE OR REPLACE FUNCTION public.cleanup_inactive_voice_rooms()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete messages first (no FK cascade defined)
  DELETE FROM public.voice_room_messages
    WHERE room_id IN (
      SELECT id FROM public.voice_rooms
      WHERE last_activity_at < (now() - INTERVAL '30 minutes')
    );
  DELETE FROM public.voice_rooms
    WHERE last_activity_at < (now() - INTERVAL '30 minutes');
END;
$$;

-- Lock down user_roles writes: only service role may modify
CREATE POLICY "Only service role can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Only service role can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Only service role can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (false);