CREATE OR REPLACE FUNCTION public.enforce_system_message_rules()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  system_uid uuid := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  -- Allow the service role (used by trusted edge functions) to bypass these checks
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Block anyone (other than admins) from sending FROM the system account
  IF NEW.sender_id = system_uid THEN
    IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'Only admins may send official TradersWorld announcements';
    END IF;
  END IF;

  -- Block everyone from sending TO the system account (one-way channel)
  IF NEW.receiver_id = system_uid THEN
    RAISE EXCEPTION 'The TradersWorld announcements channel does not accept replies';
  END IF;

  RETURN NEW;
END;
$function$;