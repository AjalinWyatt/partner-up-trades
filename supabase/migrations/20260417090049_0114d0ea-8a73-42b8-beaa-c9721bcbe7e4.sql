CREATE TABLE public.passed_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  passer_id uuid NOT NULL,
  passed_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (passer_id, passed_id)
);

ALTER TABLE public.passed_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can pass others"
  ON public.passed_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = passer_id);

CREATE POLICY "Users can unpass"
  ON public.passed_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = passer_id);

CREATE POLICY "Users can view own passes"
  ON public.passed_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = passer_id);

CREATE INDEX idx_passed_profiles_passer ON public.passed_profiles(passer_id);