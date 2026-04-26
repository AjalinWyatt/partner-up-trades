DROP POLICY IF EXISTS "Users can view own journal entries" ON public.journal_entries;

CREATE POLICY "Users can view own journal entries"
ON public.journal_entries
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view non-private journal entries"
ON public.journal_entries
FOR SELECT
TO authenticated
USING (COALESCE(share_setting, 'private') <> 'private');