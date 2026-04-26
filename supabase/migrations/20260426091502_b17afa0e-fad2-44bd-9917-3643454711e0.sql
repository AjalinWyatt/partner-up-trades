ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS share_to_feed boolean NOT NULL DEFAULT true;