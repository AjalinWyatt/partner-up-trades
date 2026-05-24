
-- 1) Privatize DM-related buckets (existing public URLs continue to work
--    because client-side helper re-signs them via the bucket/path)
UPDATE storage.buckets SET public = false WHERE id IN ('audio-messages','message-attachments');

-- Drop any prior public-read policies we may have on these buckets so we can
-- redefine them cleanly (no-op if they don't exist).
DROP POLICY IF EXISTS "Public can read audio-messages" ON storage.objects;
DROP POLICY IF EXISTS "Public can read message-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read audio-messages" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read message-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users upload audio-messages to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users upload message-attachments to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own audio-messages" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own message-attachments" ON storage.objects;

CREATE POLICY "Authenticated can read audio-messages"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'audio-messages');

CREATE POLICY "Authenticated can read message-attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'message-attachments');

CREATE POLICY "Users upload audio-messages to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'audio-messages' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload message-attachments to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'message-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own audio-messages"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'audio-messages' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own message-attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'message-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 2) Replace raw date_of_birth exposure with a birth_year column for age calc.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_year integer;
UPDATE public.profiles SET birth_year = EXTRACT(YEAR FROM date_of_birth)::int
WHERE birth_year IS NULL AND date_of_birth IS NOT NULL;

-- Keep a trigger so any future DOB write also writes birth_year
CREATE OR REPLACE FUNCTION public.sync_birth_year()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.date_of_birth IS NOT NULL THEN
    NEW.birth_year := EXTRACT(YEAR FROM NEW.date_of_birth)::int;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_birth_year_trg ON public.profiles;
CREATE TRIGGER sync_birth_year_trg
BEFORE INSERT OR UPDATE OF date_of_birth ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_birth_year();

-- Revoke direct SELECT of the raw birthday from regular users.
-- The app only needs birth_year (to compute age), never the exact date.
REVOKE SELECT (date_of_birth) ON public.profiles FROM authenticated, anon;
