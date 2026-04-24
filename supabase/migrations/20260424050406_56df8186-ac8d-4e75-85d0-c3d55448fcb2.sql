-- Allow senders to update their own messages (edit content)
CREATE POLICY "Senders can update own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- Allow senders to delete their own messages
CREATE POLICY "Senders can delete own messages"
ON public.messages
FOR DELETE
TO authenticated
USING (auth.uid() = sender_id);

-- Track edit state
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone;