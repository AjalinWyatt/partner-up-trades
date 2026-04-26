CREATE TABLE public.post_comment_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

CREATE INDEX idx_post_comment_likes_comment ON public.post_comment_likes(comment_id);
CREATE INDEX idx_post_comment_likes_user ON public.post_comment_likes(user_id);

ALTER TABLE public.post_comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view comment likes"
  ON public.post_comment_likes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can like comments"
  ON public.post_comment_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike own comment likes"
  ON public.post_comment_likes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);