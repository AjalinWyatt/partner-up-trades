
-- Create audio-messages bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('audio-messages', 'audio-messages', true) ON CONFLICT (id) DO NOTHING;

-- Create message-attachments bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('message-attachments', 'message-attachments', true) ON CONFLICT (id) DO NOTHING;

-- RLS policies for audio-messages
CREATE POLICY "Authenticated users can upload audio messages"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'audio-messages');

CREATE POLICY "Anyone can view audio messages"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'audio-messages');

CREATE POLICY "Users can delete own audio messages"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'audio-messages' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS policies for message-attachments
CREATE POLICY "Authenticated users can upload message attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'message-attachments');

CREATE POLICY "Anyone can view message attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'message-attachments');

CREATE POLICY "Users can delete own message attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'message-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Add media columns to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_type text;
