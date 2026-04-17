CREATE TABLE public.saved_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  saver_id UUID NOT NULL,
  saved_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (saver_id, saved_id)
);

ALTER TABLE public.saved_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view saves involving them"
ON public.saved_profiles FOR SELECT
TO authenticated
USING (auth.uid() = saver_id OR auth.uid() = saved_id);

CREATE POLICY "Users can save others"
ON public.saved_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = saver_id);

CREATE POLICY "Users can unsave"
ON public.saved_profiles FOR DELETE
TO authenticated
USING (auth.uid() = saver_id);

CREATE INDEX idx_saved_profiles_saver ON public.saved_profiles(saver_id);
CREATE INDEX idx_saved_profiles_saved ON public.saved_profiles(saved_id);