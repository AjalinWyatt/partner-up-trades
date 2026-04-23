ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS media_urls text[] NOT NULL DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[];

UPDATE public.posts
SET media_urls = CASE
  WHEN media_url IS NOT NULL AND coalesce(array_length(media_urls, 1), 0) = 0 THEN ARRAY[media_url]
  ELSE media_urls
END;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'posts_media_urls_max_4'
  ) THEN
    ALTER TABLE public.posts
    ADD CONSTRAINT posts_media_urls_max_4
    CHECK (coalesce(array_length(media_urls, 1), 0) <= 4);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_posts_tags_gin
ON public.posts
USING gin(tags);