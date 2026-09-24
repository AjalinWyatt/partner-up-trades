CREATE OR REPLACE FUNCTION public.drop_muted_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.muted_users WHERE muter_id = NEW.user_id AND muted_id = NEW.actor_id) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.drop_muted_notifications() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER notifications_drop_muted BEFORE INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.drop_muted_notifications();