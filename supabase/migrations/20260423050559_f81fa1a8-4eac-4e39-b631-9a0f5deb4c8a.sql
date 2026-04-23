CREATE TABLE public.stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  caption TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active stories"
ON public.stories
FOR SELECT
TO authenticated
USING (expires_at > now());

CREATE POLICY "Users can create own stories"
ON public.stories
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories"
ON public.stories
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_stories_created_at ON public.stories (created_at DESC);
CREATE INDEX idx_stories_expires_at ON public.stories (expires_at);
CREATE INDEX idx_stories_user_created_at ON public.stories (user_id, created_at DESC);

CREATE TABLE public.story_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (story_id, viewer_id)
);

ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can record own story views"
ON public.story_views
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Users can view own story views"
ON public.story_views
FOR SELECT
TO authenticated
USING (auth.uid() = viewer_id);

CREATE INDEX idx_story_views_viewer_id ON public.story_views (viewer_id);
CREATE INDEX idx_story_views_story_id ON public.story_views (story_id);