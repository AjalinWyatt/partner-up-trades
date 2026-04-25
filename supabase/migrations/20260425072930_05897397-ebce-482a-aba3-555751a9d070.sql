-- Extend waitlist
ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS wants_beta boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS markets text[] NOT NULL DEFAULT '{}'::text[];

-- Beta access keys (hashed)
CREATE TABLE IF NOT EXISTS public.beta_access_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash text NOT NULL UNIQUE,
  label text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.beta_access_keys ENABLE ROW LEVEL SECURITY;

-- No public access at all; only service role / definer functions can read.
CREATE POLICY "Service role manages beta keys"
  ON public.beta_access_keys
  FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Verify function (security definer so it can read the hashes)
CREATE OR REPLACE FUNCTION public.verify_beta_key(submitted_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  is_valid boolean;
BEGIN
  IF submitted_key IS NULL OR length(submitted_key) < 4 THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.beta_access_keys
    WHERE active = true
      AND key_hash = encode(extensions.digest(submitted_key, 'sha256'), 'hex')
  ) INTO is_valid;

  RETURN COALESCE(is_valid, false);
END;
$$;

-- Allow anyone to call verify (it only returns boolean, no leaks)
GRANT EXECUTE ON FUNCTION public.verify_beta_key(text) TO anon, authenticated;

-- Helper to seed/rotate the shared key (service role only)
CREATE OR REPLACE FUNCTION public.set_beta_key(new_key text, new_label text DEFAULT 'shared')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Only service role can set beta keys';
  END IF;

  UPDATE public.beta_access_keys SET active = false WHERE active = true;

  INSERT INTO public.beta_access_keys (key_hash, label, active)
  VALUES (encode(extensions.digest(new_key, 'sha256'), 'hex'), new_label, true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_beta_key(text, text) FROM anon, authenticated;

-- Make sure pgcrypto is available for digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;