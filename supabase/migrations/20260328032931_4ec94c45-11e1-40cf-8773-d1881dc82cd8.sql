
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  full_name text,
  avatar_url text,
  gender text,
  location text,
  hobbies text[] DEFAULT '{}',
  chart_prompts text[] DEFAULT '{}',
  off_chart_prompts text[] DEFAULT '{}',
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE TABLE public.trading_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  markets text[] DEFAULT '{}',
  sessions text[] DEFAULT '{}',
  trade_times text[] DEFAULT '{}',
  trading_style text[] DEFAULT '{}',
  strategies text[] DEFAULT '{}',
  timeframes text[] DEFAULT '{}',
  frequency text[] DEFAULT '{}',
  experience_level text,
  primary_goal text[] DEFAULT '{}',
  loss_response text,
  struggles text[] DEFAULT '{}',
  journaling text[] DEFAULT '{}',
  trading_plan text[] DEFAULT '{}',
  looking_for_gender text,
  connection_reach text,
  connection_types text[] DEFAULT '{}',
  connect_frequency text[] DEFAULT '{}',
  match_priorities text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.trading_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public trading profiles are viewable by everyone"
  ON public.trading_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own trading profile"
  ON public.trading_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own trading profile"
  ON public.trading_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  INSERT INTO public.trading_profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
