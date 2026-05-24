-- Restore SELECT on the columns that were revoked
GRANT SELECT (date_of_birth, notify_email, notify_partner_activity, notify_new_matches, notify_messages, username_changes_count)
  ON public.profiles TO authenticated;

-- Drop the now-unused helpers
DROP FUNCTION IF EXISTS public.get_my_private_profile();
DROP VIEW IF EXISTS public.profile_ages;

-- Restore public storage buckets
UPDATE storage.buckets SET public = true
  WHERE id IN ('audio-messages', 'message-attachments');

-- Remove the auth-gated storage policies (public buckets don't need them)
DROP POLICY IF EXISTS "Authenticated can read audio-messages" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload audio-messages to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own audio-messages" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read message-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload message-attachments to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own message-attachments" ON storage.objects;