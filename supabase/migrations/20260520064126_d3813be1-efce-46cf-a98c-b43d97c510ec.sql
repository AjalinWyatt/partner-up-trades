
CREATE TABLE public.voice_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id uuid NOT NULL,
  title text NOT NULL,
  topic text,
  market text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view rooms" ON public.voice_rooms
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own rooms" ON public.voice_rooms
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host updates own room" ON public.voice_rooms
  FOR UPDATE TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host deletes own room" ON public.voice_rooms
  FOR DELETE TO authenticated USING (auth.uid() = host_id);

CREATE TRIGGER set_voice_rooms_updated_at
  BEFORE UPDATE ON public.voice_rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

CREATE INDEX idx_voice_rooms_active ON public.voice_rooms (is_active, created_at DESC);

CREATE TABLE public.voice_room_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.voice_rooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text,
  media_url text,
  media_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_room_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view room messages" ON public.voice_room_messages
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users send own room messages" ON public.voice_room_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Senders delete own room messages" ON public.voice_room_messages
  FOR DELETE TO authenticated USING (auth.uid() = sender_id);

CREATE INDEX idx_voice_room_messages_room ON public.voice_room_messages (room_id, created_at);

ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_room_messages;
