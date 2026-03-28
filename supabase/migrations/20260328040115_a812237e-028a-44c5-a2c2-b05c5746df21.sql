
-- Add match_breakdown jsonb column to partner_connections
ALTER TABLE public.partner_connections ADD COLUMN IF NOT EXISTS match_score integer DEFAULT 0;
ALTER TABLE public.partner_connections ADD COLUMN IF NOT EXISTS match_breakdown jsonb DEFAULT '{}';

-- Create feed_likes table
CREATE TABLE IF NOT EXISTS public.feed_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, entry_id)
);

-- Create feed_comments table
CREATE TABLE IF NOT EXISTS public.feed_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;

-- RLS for feed_likes
CREATE POLICY "Users can view all likes" ON public.feed_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own likes" ON public.feed_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own likes" ON public.feed_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS for feed_comments
CREATE POLICY "Users can view all comments" ON public.feed_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own comments" ON public.feed_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.feed_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);
