
-- Pulse requests
CREATE TABLE public.pulse_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  context text[] NOT NULL DEFAULT '{}',
  note text,
  status text NOT NULL DEFAULT 'open',
  accepted_by uuid,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  CONSTRAINT pulse_requests_status_check CHECK (status IN ('open','accepted','cancelled','expired'))
);

CREATE INDEX idx_pulse_requests_status_created ON public.pulse_requests (status, created_at DESC);
CREATE INDEX idx_pulse_requests_requester ON public.pulse_requests (requester_id);
CREATE INDEX idx_pulse_requests_accepted_by ON public.pulse_requests (accepted_by);

ALTER TABLE public.pulse_requests ENABLE ROW LEVEL SECURITY;

-- Anyone authed can see open requests; participants always see their own
CREATE POLICY "View open or own pulse requests"
ON public.pulse_requests FOR SELECT TO authenticated
USING (
  status = 'open'
  OR auth.uid() = requester_id
  OR auth.uid() = accepted_by
);

CREATE POLICY "Users insert own pulse requests"
ON public.pulse_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = requester_id AND status = 'open' AND accepted_by IS NULL);

-- Update allowed if you are: (a) any authed user accepting an open one (becomes accepted_by),
-- (b) requester cancelling own, (c) either participant after acceptance
CREATE POLICY "Accept or manage pulse requests"
ON public.pulse_requests FOR UPDATE TO authenticated
USING (
  (status = 'open' AND auth.uid() <> requester_id)
  OR auth.uid() = requester_id
  OR auth.uid() = accepted_by
)
WITH CHECK (
  (status = 'accepted' AND accepted_by = auth.uid())
  OR (status = 'cancelled' AND auth.uid() = requester_id)
  OR (status = 'expired')
  OR auth.uid() = requester_id
  OR auth.uid() = accepted_by
);

-- Pulse messages
CREATE TABLE public.pulse_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.pulse_requests(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text,
  media_url text,
  media_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pulse_messages_session_created ON public.pulse_messages (session_id, created_at);

ALTER TABLE public.pulse_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pulse participants can view messages"
ON public.pulse_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pulse_requests pr
    WHERE pr.id = pulse_messages.session_id
      AND (auth.uid() = pr.requester_id OR auth.uid() = pr.accepted_by)
  )
);

CREATE POLICY "Pulse participants can send messages"
ON public.pulse_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.pulse_requests pr
    WHERE pr.id = pulse_messages.session_id
      AND pr.status = 'accepted'
      AND (auth.uid() = pr.requester_id OR auth.uid() = pr.accepted_by)
  )
);

-- Helper to expire old open requests (called opportunistically from client)
CREATE OR REPLACE FUNCTION public.expire_stale_pulse_requests()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.pulse_requests
  SET status = 'expired'
  WHERE status = 'open' AND expires_at < now();
$$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pulse_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pulse_messages;
ALTER TABLE public.pulse_requests REPLICA IDENTITY FULL;
ALTER TABLE public.pulse_messages REPLICA IDENTITY FULL;
