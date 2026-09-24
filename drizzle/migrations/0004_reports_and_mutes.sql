CREATE TABLE public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_id uuid NOT NULL,
  context text NOT NULL DEFAULT 'profile' CHECK (context IN ('profile','chat')),
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','actioned','dismissed')),
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (reporter_id <> reported_id),
  CHECK (char_length(reason) <= 60),
  CHECK (details IS NULL OR char_length(details) <= 1000)
);
GRANT SELECT, INSERT, UPDATE ON public.user_reports TO authenticated;
GRANT ALL ON public.user_reports TO service_role;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users file own reports" ON public.user_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() AND status = 'open' AND reviewed_by IS NULL AND admin_note IS NULL);
CREATE POLICY "Users see own reports; admins see all" ON public.user_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins review reports" ON public.user_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE INDEX user_reports_status_idx ON public.user_reports (status, created_at DESC);

CREATE TABLE public.muted_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  muter_id uuid NOT NULL,
  muted_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (muter_id, muted_id),
  CHECK (muter_id <> muted_id)
);
GRANT SELECT, INSERT, DELETE ON public.muted_users TO authenticated;
GRANT ALL ON public.muted_users TO service_role;
ALTER TABLE public.muted_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own mutes select" ON public.muted_users FOR SELECT TO authenticated USING (muter_id = auth.uid());
CREATE POLICY "Own mutes insert" ON public.muted_users FOR INSERT TO authenticated WITH CHECK (muter_id = auth.uid());
CREATE POLICY "Own mutes delete" ON public.muted_users FOR DELETE TO authenticated USING (muter_id = auth.uid());