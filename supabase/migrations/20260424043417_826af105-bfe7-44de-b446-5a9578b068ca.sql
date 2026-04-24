
CREATE TABLE public.conversation_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'primary',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE public.conversation_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tags" ON public.conversation_tags
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own tags" ON public.conversation_tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own tags" ON public.conversation_tags
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own tags" ON public.conversation_tags
  FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.conversation_tag_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tag_id UUID NOT NULL REFERENCES public.conversation_tags(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tag_id, partner_id)
);

ALTER TABLE public.conversation_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own assignments" ON public.conversation_tag_assignments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own assignments" ON public.conversation_tag_assignments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own assignments" ON public.conversation_tag_assignments
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_conv_tag_assign_user ON public.conversation_tag_assignments(user_id);
CREATE INDEX idx_conv_tag_assign_partner ON public.conversation_tag_assignments(partner_id);
