-- 1. Pulse: max 3 help requests per calendar month (server enforced)
CREATE OR REPLACE FUNCTION public.enforce_pulse_monthly_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF (SELECT count(*) FROM public.pulse_requests
      WHERE requester_id = NEW.requester_id
        AND status <> 'cancelled'
        AND created_at >= date_trunc('month', now())) >= 3 THEN
    RAISE EXCEPTION 'You can send up to 3 help requests per month';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS pulse_monthly_limit ON public.pulse_requests;
CREATE TRIGGER pulse_monthly_limit BEFORE INSERT ON public.pulse_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_pulse_monthly_limit();

-- 2. Pulse: only participants may change state; no arbitrary "expired" by strangers
DROP POLICY IF EXISTS "Accept or manage pulse requests" ON public.pulse_requests;
CREATE POLICY "Accept or manage pulse requests" ON public.pulse_requests
FOR UPDATE TO authenticated
USING (((status = 'open') AND (auth.uid() <> requester_id)) OR auth.uid() = requester_id OR auth.uid() = accepted_by)
WITH CHECK (((status = 'accepted') AND (accepted_by = auth.uid()) AND auth.uid() <> requester_id)
  OR auth.uid() = requester_id OR auth.uid() = accepted_by);
GRANT EXECUTE ON FUNCTION public.expire_stale_pulse_requests() TO authenticated;

-- 3. Connections: only the receiver can accept/decline; participants can't be swapped
CREATE OR REPLACE FUNCTION public.guard_partner_connection_update()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF NEW.requester_id <> OLD.requester_id OR NEW.receiver_id <> OLD.receiver_id THEN
    RAISE EXCEPTION 'Connection participants cannot be changed';
  END IF;
  IF OLD.status = 'pending' AND NEW.status IN ('accepted','declined') AND auth.uid() <> OLD.receiver_id THEN
    RAISE EXCEPTION 'Only the recipient can respond to this request';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS partner_connections_guard ON public.partner_connections;
CREATE TRIGGER partner_connections_guard BEFORE UPDATE ON public.partner_connections
FOR EACH ROW EXECUTE FUNCTION public.guard_partner_connection_update();

-- 4. Messages: only accepted, non-blocked partners can DM
DROP POLICY IF EXISTS "Users can insert messages they send" ON public.messages;
CREATE POLICY "Users can insert messages they send" ON public.messages
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id
  AND receiver_id <> '00000000-0000-0000-0000-000000000001'::uuid
  AND public.are_accepted_partners(sender_id, receiver_id)
  AND NOT public.is_blocked_by(receiver_id, sender_id)
  AND NOT public.is_blocked_by(sender_id, receiver_id));