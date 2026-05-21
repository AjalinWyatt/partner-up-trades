
-- 1. Add last_activity_at to voice_rooms
ALTER TABLE public.voice_rooms
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz NOT NULL DEFAULT now();

-- 2. Trigger to bump last_activity_at when a message is inserted
CREATE OR REPLACE FUNCTION public.bump_voice_room_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.voice_rooms
    SET last_activity_at = now()
    WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_voice_room_activity ON public.voice_room_messages;
CREATE TRIGGER trg_bump_voice_room_activity
AFTER INSERT ON public.voice_room_messages
FOR EACH ROW EXECUTE FUNCTION public.bump_voice_room_activity();

-- 3. Cleanup function: close rooms with >30 min of inactivity
CREATE OR REPLACE FUNCTION public.cleanup_inactive_voice_rooms()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.voice_rooms
    SET is_active = false
    WHERE is_active = true
      AND last_activity_at < (now() - INTERVAL '30 minutes');
END;
$$;

-- 4. Schedule cleanup every 5 minutes
DO $$
BEGIN
  PERFORM cron.unschedule('voice-rooms-cleanup');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'voice-rooms-cleanup',
  '*/5 * * * *',
  $$SELECT public.cleanup_inactive_voice_rooms();$$
);

-- 5. Remove weekly market threads cron (Threads feature removed)
DO $$
BEGIN
  PERFORM cron.unschedule('weekly-market-threads');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
