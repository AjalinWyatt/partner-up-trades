CREATE UNIQUE INDEX IF NOT EXISTS partner_connections_unique_pair
ON public.partner_connections (LEAST(requester_id, receiver_id), GREATEST(requester_id, receiver_id));