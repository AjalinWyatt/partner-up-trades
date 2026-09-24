CREATE POLICY "Conversation participants can read message-attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'message-attachments' AND public.can_view_audio_message(name, auth.uid()));