
-- Add new columns to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS content text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_type text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT 0;

-- Make image_url nullable (posts can be text-only now)
ALTER TABLE public.posts ALTER COLUMN image_url DROP NOT NULL;

-- Create post_likes table
CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all post likes" ON public.post_likes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own post likes" ON public.post_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own post likes" ON public.post_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all comments" ON public.comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own comments" ON public.comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
