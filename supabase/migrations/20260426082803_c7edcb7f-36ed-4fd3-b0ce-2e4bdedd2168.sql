-- Normalize existing usernames to fit the new format before adding the constraint
UPDATE public.profiles
SET username = NULLIF(
  regexp_replace(lower(coalesce(username, '')), '[^a-z0-9_.]', '', 'g'),
  ''
)
WHERE username IS NOT NULL;

-- If the cleaned value is too short, clear it (user must pick a new one)
UPDATE public.profiles
SET username = NULL
WHERE username IS NOT NULL AND char_length(username) < 3;

-- Truncate any usernames that are too long
UPDATE public.profiles
SET username = substring(username, 1, 30)
WHERE username IS NOT NULL AND char_length(username) > 30;

-- Resolve duplicates (case-insensitive) by suffixing _2, _3, ...
WITH ranked AS (
  SELECT id, username,
    row_number() OVER (PARTITION BY lower(username) ORDER BY created_at NULLS LAST, id) AS rn
  FROM public.profiles
  WHERE username IS NOT NULL
)
UPDATE public.profiles p
SET username = substring(r.username || '_' || r.rn, 1, 30)
FROM ranked r
WHERE p.id = r.id AND r.rn > 1;

-- Now add the columns and constraints
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username_changes_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notify_partner_activity boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_new_matches boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_messages boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_email boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS profile_visibility text NOT NULL DEFAULT 'public';

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_username_format;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_username_format
CHECK (username IS NULL OR username ~ '^[a-z0-9_.]{3,30}$');

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique
ON public.profiles (lower(username))
WHERE username IS NOT NULL;