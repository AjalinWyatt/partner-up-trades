CREATE OR REPLACE FUNCTION public.can_view_audio_message(_name text, _viewer uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _viewer IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.messages m
            WHERE m.media_url LIKE '%' || _name
              AND (m.sender_id = _viewer OR m.receiver_id = _viewer))
    OR EXISTS (SELECT 1 FROM public.pulse_messages pm
               JOIN public.pulse_requests pr ON pr.id = pm.session_id
               WHERE pm.media_url LIKE '%' || _name
                 AND (pr.requester_id = _viewer OR pr.accepted_by = _viewer))
    OR EXISTS (SELECT 1 FROM public.voice_room_messages vm
               WHERE vm.media_url LIKE '%' || _name)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.can_view_audio_message(text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_view_audio_message(text, uuid) TO authenticated;

CREATE POLICY "Conversation participants can read audio-messages"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'audio-messages' AND public.can_view_audio_message(name, auth.uid()));