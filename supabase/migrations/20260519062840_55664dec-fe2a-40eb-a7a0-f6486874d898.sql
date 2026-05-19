CREATE OR REPLACE FUNCTION public.get_partner_checkin_streak(user_a uuid, user_b uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  streak int := 0;
  cur_day date := (now() at time zone 'utc')::date;
  has_a boolean;
  has_b boolean;
  guard int := 0;
BEGIN
  IF user_a IS NULL OR user_b IS NULL OR user_a = user_b THEN
    RETURN 0;
  END IF;

  LOOP
    SELECT EXISTS (
      SELECT 1 FROM public.messages
      WHERE sender_id = user_a AND receiver_id = user_b
        AND (created_at at time zone 'utc')::date = cur_day
    ) INTO has_a;
    SELECT EXISTS (
      SELECT 1 FROM public.messages
      WHERE sender_id = user_b AND receiver_id = user_a
        AND (created_at at time zone 'utc')::date = cur_day
    ) INTO has_b;

    IF has_a AND has_b THEN
      streak := streak + 1;
      cur_day := cur_day - INTERVAL '1 day';
    ELSIF streak = 0 AND cur_day = (now() at time zone 'utc')::date THEN
      -- Today not yet completed: don't break the streak, check yesterday
      cur_day := cur_day - INTERVAL '1 day';
    ELSE
      EXIT;
    END IF;

    guard := guard + 1;
    IF guard > 365 THEN EXIT; END IF;
  END LOOP;

  RETURN streak;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_partner_checkin_streak(uuid, uuid) TO authenticated, anon, service_role;