-- 1. Base tables
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  gender text,
  location text,
  bio text,
  hobbies text[] default '{}',
  looking_for text,
  reach text,
  connection_types text[] default '{}',
  connect_frequency text[] default '{}',
  match_priorities text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.trading_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  markets text[] default '{}',
  sessions text[] default '{}',
  trade_times text[] default '{}',
  trading_style text[] default '{}',
  strategies text[] default '{}',
  timeframes text[] default '{}',
  frequency text[] default '{}',
  experience_level text,
  primary_goals text[] default '{}',
  loss_response text,
  struggles text[] default '{}',
  journaling text[] default '{}',
  trading_plan text[] default '{}',
  chart_prompts text[] default '{}',
  off_chart_prompts text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Enable RLS
alter table public.profiles enable row level security;
alter table public.trading_profiles enable row level security;

-- 3. Helper function
create or replace function public.is_own_profile(_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() = _id
$$;

-- 4. RLS policies - profiles
create policy "Anyone can view profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (public.is_own_profile(id));

-- 5. RLS policies - trading_profiles
create policy "Anyone can view trading profiles"
  on public.trading_profiles for select
  to authenticated
  using (true);

create policy "Users can insert own trading profile"
  on public.trading_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own trading profile"
  on public.trading_profiles for update
  to authenticated
  using (public.is_own_profile(user_id));

-- 6. Auto-create profile + trading_profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'full_name'
  );
  insert into public.trading_profiles (user_id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
