CREATE TABLE IF NOT EXISTS public.saved_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  post_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);

ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved posts"
ON public.saved_posts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can save posts"
ON public.saved_posts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave posts"
ON public.saved_posts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_saved_posts_user_id ON public.saved_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_post_id ON public.saved_posts(post_id);

CREATE TABLE IF NOT EXISTS public.post_reposts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  post_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);

ALTER TABLE public.post_reposts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reposts"
ON public.post_reposts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can repost posts"
ON public.post_reposts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reposts"
ON public.post_reposts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_post_reposts_user_id ON public.post_reposts(user_id);
CREATE INDEX IF NOT EXISTS idx_post_reposts_post_id ON public.post_reposts(post_id);