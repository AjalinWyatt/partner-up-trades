CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  raw_username text;
  candidate    text;
  final_username text;
  suffix int := 0;
BEGIN
  -- Pick the best raw source for a username, in order of preference
  raw_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'preferred_username',
    split_part(NEW.email, '@', 1)
  );

  -- Sanitize to match the profiles_username_format check:
  --   ^[a-z0-9_.]{3,30}$
  candidate := lower(coalesce(raw_username, ''));
  candidate := regexp_replace(candidate, '[^a-z0-9_.]', '', 'g');
  -- Trim leading/trailing dots/underscores for tidiness
  candidate := regexp_replace(candidate, '^[._]+|[._]+$', '', 'g');

  -- Pad if too short
  IF length(candidate) < 3 THEN
    candidate := 'trader' || substr(replace(NEW.id::text, '-', ''), 1, 6);
  END IF;

  -- Truncate if too long (leave room for a possible numeric suffix)
  IF length(candidate) > 24 THEN
    candidate := substr(candidate, 1, 24);
  END IF;

  -- Ensure uniqueness, falling back to numeric suffixes on collision
  final_username := candidate;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    suffix := suffix + 1;
    final_username := substr(candidate, 1, 30 - length(suffix::text)) || suffix::text;
    IF suffix > 9999 THEN
      -- Last-resort fallback that is guaranteed unique
      final_username := 'trader' || substr(replace(NEW.id::text, '-', ''), 1, 10);
      EXIT;
    END IF;
  END LOOP;

  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );

  INSERT INTO public.trading_profiles (user_id)
  VALUES (NEW.id);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block auth signup if profile creation hiccups; log and continue.
  RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;