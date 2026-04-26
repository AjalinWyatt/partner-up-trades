
CREATE TABLE public.albums (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  cover_post_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Albums are viewable by everyone"
ON public.albums FOR SELECT USING (true);

CREATE POLICY "Users can create own albums"
ON public.albums FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own albums"
ON public.albums FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own albums"
ON public.albums FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER albums_set_updated_at
BEFORE UPDATE ON public.albums
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

CREATE TABLE public.album_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  album_id UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (album_id, post_id)
);

CREATE INDEX album_posts_album_id_idx ON public.album_posts(album_id);
CREATE INDEX album_posts_post_id_idx ON public.album_posts(post_id);

ALTER TABLE public.album_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Album posts are viewable by everyone"
ON public.album_posts FOR SELECT USING (true);

CREATE POLICY "Users can add to own albums"
ON public.album_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own album posts"
ON public.album_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from own albums"
ON public.album_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);
