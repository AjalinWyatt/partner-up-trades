ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pulse_available_until timestamptz;
ALTER TABLE public.pulse_requests ADD COLUMN IF NOT EXISTS ended_at timestamptz;
ALTER TABLE public.pulse_requests ADD COLUMN IF NOT EXISTS ended_by uuid;
ALTER TABLE public.pulse_requests DROP CONSTRAINT pulse_requests_status_check;
ALTER TABLE public.pulse_requests ADD CONSTRAINT pulse_requests_status_check
  CHECK (status = ANY (ARRAY['open','accepted','cancelled','expired','completed']));

CREATE OR REPLACE FUNCTION public.is_pulse_available(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid AND pulse_available_until > now())
$$;

-- Toggle availability (max 120 minutes)
CREATE OR REPLACE FUNCTION public.set_pulse_availability(_on boolean)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  v := CASE WHEN _on THEN now() + interval '120 minutes' ELSE NULL END;
  UPDATE public.profiles SET pulse_available_until = v WHERE id = auth.uid();
  RETURN v;
END; $$;

-- Only one available helper can accept; turns helper availability off
CREATE OR REPLACE FUNCTION public.accept_pulse_request(_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_pulse_available(auth.uid()) THEN
    RAISE EXCEPTION 'Turn on Available to Help first';
  END IF;
  UPDATE public.pulse_requests
     SET status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
   WHERE id = _id AND status = 'open' AND requester_id <> auth.uid() AND expires_at > now();
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 1 THEN
    UPDATE public.profiles SET pulse_available_until = NULL WHERE id = auth.uid();
  END IF;
  RETURN n = 1;
END; $$;

-- Either participant ends the session; history kept
CREATE OR REPLACE FUNCTION public.end_pulse_session(_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n int;
BEGIN
  UPDATE public.pulse_requests
     SET status = 'completed', ended_at = now(), ended_by = auth.uid()
   WHERE id = _id AND status = 'accepted'
     AND auth.uid() IN (requester_id, accepted_by);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n = 1;
END; $$;

REVOKE EXECUTE ON FUNCTION public.set_pulse_availability(boolean), public.accept_pulse_request(uuid), public.end_pulse_session(uuid), public.is_pulse_available(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.set_pulse_availability(boolean), public.accept_pulse_request(uuid), public.end_pulse_session(uuid), public.is_pulse_available(uuid) TO authenticated;

-- Open requests only visible to currently-available helpers
DROP POLICY IF EXISTS "View open or own pulse requests" ON public.pulse_requests;
CREATE POLICY "View open or own pulse requests" ON public.pulse_requests
FOR SELECT TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = accepted_by
  OR (status = 'open' AND public.is_pulse_available(auth.uid())));

-- State changes go through the functions above; requester may only cancel their open request
DROP POLICY IF EXISTS "Accept or manage pulse requests" ON public.pulse_requests;
CREATE POLICY "Requester cancels own open pulse" ON public.pulse_requests
FOR UPDATE TO authenticated
USING (auth.uid() = requester_id AND status = 'open')
WITH CHECK (auth.uid() = requester_id AND status = 'cancelled' AND accepted_by IS NULL);