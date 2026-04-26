-- 1) Create the TradersWorld auth user (no password, cannot log in normally)
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'system+tradersworld@tradersworld.app',
  crypt(gen_random_uuid()::text, gen_salt('bf')),
  now(),
  '{"provider":"system","providers":["system"]}'::jsonb,
  '{"username":"tradersworld","full_name":"TradersWorld"}'::jsonb,
  now(), now(), '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

-- handle_new_user trigger should auto-create the profile, but make sure values are right
INSERT INTO public.profiles (id, username, full_name, bio, onboarding_completed, profile_visibility)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'tradersworld',
  'TradersWorld',
  'Official TradersWorld account.',
  true,
  'public'
)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  full_name = EXCLUDED.full_name,
  bio = EXCLUDED.bio,
  onboarding_completed = EXCLUDED.onboarding_completed,
  profile_visibility = EXCLUDED.profile_visibility;

-- 2) Track which one-time system DMs each user has received
CREATE TABLE public.system_dm_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  dm_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, dm_key)
);

ALTER TABLE public.system_dm_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own system DM log"
  ON public.system_dm_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own system DM log"
  ON public.system_dm_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3) Allow inserting messages where the sender is the TradersWorld system account
--    and the receiver is the current user (safe: users can only deliver these to themselves).
CREATE POLICY "System DMs from TradersWorld can be inserted by recipient"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = '00000000-0000-0000-0000-000000000001'::uuid
    AND receiver_id = auth.uid()
  );