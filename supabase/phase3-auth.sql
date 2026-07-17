-- ============================================================
-- SplitWiz — Phase 3: Authentication
-- Run this in the Supabase SQL Editor AFTER phase2-schema.sql
-- ============================================================

-- ============================================================
-- Profiles table — one row per auth.users row
-- ============================================================

create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table profiles enable row level security;

-- Users can read and write only their own profile.
create policy "user_own_profile"
  on profiles for all
  using  (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================
-- Auto-create a profile when a user signs up
-- ============================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- Supabase Auth configuration (do in the dashboard, not SQL)
-- ============================================================
-- 1. Authentication → Providers → Email: enable "Confirm email"
-- 2. Authentication → Providers → Google: add Client ID + Secret
--    from Google Cloud Console (OAuth 2.0 credentials)
-- 3. Authentication → URL Configuration:
--    Site URL: https://your-vercel-domain.vercel.app
--    Redirect URLs (add all):
--      http://localhost:3000/auth/callback
--      https://your-vercel-domain.vercel.app/auth/callback
