-- =========================================================
-- System announcement guardrails
-- =========================================================
-- The TradersWorld system account is 00000000-0000-0000-0000-000000000001.
-- Goals:
--   1. Only admins may send messages FROM the system account.
--   2. No one may send messages TO the system account (one-way channel).
--   3. Edits/deletes of system messages restricted to admins.

-- Drop the previous self-insert-as-system policy
DROP POLICY IF EXISTS "System DMs from TradersWorld can be inserted by recipient" ON public.messages;

-- Tighten the generic INSERT policy: sender must be auth.uid() AND
-- receiver must NOT be the system account.
DROP POLICY IF EXISTS "Users can insert messages they send" ON public.messages;
CREATE POLICY "Users can insert messages they send"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND receiver_id <> '00000000-0000-0000-0000-000000000001'::uuid
);

-- Allow admins to insert messages on behalf of the system account
CREATE POLICY "Admins can send system announcements"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Restrict editing/deleting system messages to admins (regular sender policies
-- can't apply because no real user owns the system account session).
DROP POLICY IF EXISTS "Admins can edit system announcements" ON public.messages;
CREATE POLICY "Admins can edit system announcements"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  sender_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  sender_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Admins can delete system announcements" ON public.messages;
CREATE POLICY "Admins can delete system announcements"
ON public.messages
FOR DELETE
TO authenticated
USING (
  sender_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Belt-and-suspenders: a trigger that enforces both rules even if a future
-- policy is added that would otherwise allow a bad insert.
CREATE OR REPLACE FUNCTION public.enforce_system_message_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  system_uid uuid := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  -- Block anyone (other than admins) from sending FROM the system account
  IF NEW.sender_id = system_uid THEN
    IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'Only admins may send official TradersWorld announcements';
    END IF;
  END IF;

  -- Block everyone from sending TO the system account (one-way channel)
  IF NEW.receiver_id = system_uid THEN
    RAISE EXCEPTION 'The TradersWorld announcements channel does not accept replies';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_system_guardrails ON public.messages;
CREATE TRIGGER messages_system_guardrails
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.enforce_system_message_rules();
