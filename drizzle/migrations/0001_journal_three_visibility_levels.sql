UPDATE public.journal_entries SET share_setting = 'private' WHERE share_setting IS NULL OR share_setting NOT IN ('private','partners','public');
ALTER TABLE public.journal_entries ALTER COLUMN share_setting SET DEFAULT 'private';
ALTER TABLE public.journal_entries ADD CONSTRAINT journal_entries_share_setting_check CHECK (share_setting IN ('private','partners','public'));

CREATE OR REPLACE FUNCTION public.are_accepted_partners(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _a IS NOT NULL AND _b IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.partner_connections
    WHERE status = 'accepted'
      AND ((requester_id = _a AND receiver_id = _b) OR (requester_id = _b AND receiver_id = _a))
  )
$$;

CREATE OR REPLACE FUNCTION public.is_blocked_by(_owner uuid, _viewer uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.blocked_users WHERE blocker_id = _owner AND blocked_id = _viewer)
$$;

REVOKE EXECUTE ON FUNCTION public.are_accepted_partners(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_blocked_by(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.are_accepted_partners(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_blocked_by(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Anyone can view non-private journal entries" ON public.journal_entries;

CREATE POLICY "Accepted partners can view partner journal entries"
ON public.journal_entries FOR SELECT TO authenticated
USING (share_setting = 'partners' AND public.are_accepted_partners(auth.uid(), user_id));

CREATE POLICY "Signed-in users can view public journal entries"
ON public.journal_entries FOR SELECT TO authenticated
USING (share_setting = 'public' AND NOT public.is_blocked_by(user_id, auth.uid()));