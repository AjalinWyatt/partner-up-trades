
ALTER TABLE public.feed_comments
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.feed_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_feed_comments_parent_id ON public.feed_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_feed_comments_entry_id ON public.feed_comments(entry_id);

CREATE TABLE IF NOT EXISTS public.feed_comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.feed_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_feed_comment_likes_comment_id ON public.feed_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_feed_comment_likes_user_id ON public.feed_comment_likes(user_id);

ALTER TABLE public.feed_comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comment likes"
  ON public.feed_comment_likes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can like comments"
  ON public.feed_comment_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike own comment likes"
  ON public.feed_comment_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_comment_likes;
