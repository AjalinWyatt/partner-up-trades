ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS image_path text;

CREATE OR REPLACE FUNCTION public.can_view_journal_media(_path text, _viewer uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.journal_entries j
    WHERE j.image_path = _path AND (
      j.user_id = _viewer
      OR (j.share_setting = 'public' AND NOT public.is_blocked_by(j.user_id, _viewer))
      OR (j.share_setting = 'partners' AND public.are_accepted_partners(j.user_id, _viewer))
    )
  )
$$;
REVOKE EXECUTE ON FUNCTION public.can_view_journal_media(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_journal_media(text, uuid) TO authenticated;

CREATE POLICY "Journal media owner upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'journal-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Journal media owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'journal-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Journal media owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'journal-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Journal media visibility read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'journal-media' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.can_view_journal_media(name, auth.uid())));