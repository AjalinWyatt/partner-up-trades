
-- Forum posts table
CREATE TABLE public.forum_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  forum text NOT NULL CHECK (forum IN ('Forex', 'Futures', 'Options')),
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  likes_count integer NOT NULL DEFAULT 0,
  replies_count integer NOT NULL DEFAULT 0
);

-- Forum replies table
CREATE TABLE public.forum_replies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Forum post likes table
CREATE TABLE public.forum_post_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

-- Enable RLS
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_post_likes ENABLE ROW LEVEL SECURITY;

-- Forum posts policies
CREATE POLICY "Anyone can view forum posts" ON public.forum_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own forum posts" ON public.forum_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own forum posts" ON public.forum_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own forum posts" ON public.forum_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Forum replies policies
CREATE POLICY "Anyone can view forum replies" ON public.forum_replies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own forum replies" ON public.forum_replies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own forum replies" ON public.forum_replies FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Forum post likes policies
CREATE POLICY "Anyone can view forum post likes" ON public.forum_post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own forum post likes" ON public.forum_post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own forum post likes" ON public.forum_post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_replies;
