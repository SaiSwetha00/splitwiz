-- ============================================================
-- SplitWiz — Phase 4: Full Database Schema
-- Run in Supabase SQL Editor AFTER phase3-auth.sql
-- ============================================================

-- ============================================================
-- Shared trigger: keep updated_at current
-- ============================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 1. CATEGORIES
-- user_id NULL = system default (visible to everyone)
-- ============================================================

create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  name        text not null,
  icon        text,
  color       text,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_categories_user_id  on categories(user_id);
create index if not exists idx_categories_default  on categories(is_default) where is_default = true;

alter table categories enable row level security;

-- System defaults are readable by everyone; user categories by their owner.
create policy "categories_select"
  on categories for select
  using (user_id is null or auth.uid() = user_id);

create policy "categories_insert"
  on categories for insert
  with check (auth.uid() = user_id);

create policy "categories_update"
  on categories for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "categories_delete"
  on categories for delete
  using (auth.uid() = user_id);

-- Seed system default categories (idempotent)
insert into categories (user_id, name, icon, color, is_default) values
  (null, 'Food & Drink',    '🍽️',  '#f59e0b', true),
  (null, 'Transport',       '🚗',  '#3b82f6', true),
  (null, 'Accommodation',   '🏨',  '#8b5cf6', true),
  (null, 'Entertainment',   '🎭',  '#ec4899', true),
  (null, 'Shopping',        '🛍️',  '#10b981', true),
  (null, 'Health',          '💊',  '#ef4444', true),
  (null, 'Utilities',       '⚡',  '#f97316', true),
  (null, 'Other',           '📦',  '#6b7280', true)
on conflict do nothing;

-- ============================================================
-- 2. Alter EXPENSES — add category_id FK
-- (keeps legacy 'category' text column for backward compat)
-- ============================================================

alter table expenses
  add column if not exists category_id uuid references categories(id) on delete set null;

create index if not exists idx_expenses_category_id on expenses(category_id);

-- ============================================================
-- 3. USER SETTINGS (one row per user)
-- ============================================================

create table if not exists user_settings (
  id                     uuid primary key references auth.users(id) on delete cascade,
  default_currency       text not null default 'USD',
  notifications_enabled  boolean not null default true,
  theme                  text not null default 'system',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create trigger trg_user_settings_updated_at
  before update on user_settings
  for each row execute function set_updated_at();

alter table user_settings enable row level security;

create policy "user_settings_all"
  on user_settings for all
  using  (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================
-- 4. BUDGETS
-- ============================================================

create table if not exists budgets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  category_id   uuid references categories(id) on delete set null,
  name          text not null,
  amount_cents  bigint not null,
  period        text not null default 'monthly',
  start_date    date not null,
  end_date      date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint budgets_period_check check (period in ('daily','weekly','monthly','yearly'))
);

create index if not exists idx_budgets_user_id     on budgets(user_id);
create index if not exists idx_budgets_category_id on budgets(category_id);

create trigger trg_budgets_updated_at
  before update on budgets
  for each row execute function set_updated_at();

alter table budgets enable row level security;

create policy "budgets_all"
  on budgets for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 5. SAVINGS GOALS
-- ============================================================

create table if not exists savings_goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  icon           text,
  target_cents   bigint not null,
  current_cents  bigint not null default 0,
  deadline       date,
  completed      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_savings_goals_user_id on savings_goals(user_id);

create trigger trg_savings_goals_updated_at
  before update on savings_goals
  for each row execute function set_updated_at();

alter table savings_goals enable row level security;

create policy "savings_goals_all"
  on savings_goals for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 6. SUBSCRIPTIONS
-- ============================================================

create table if not exists subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  category_id         uuid references categories(id) on delete set null,
  name                text not null,
  description         text,
  amount_cents        bigint not null,
  currency            text not null default 'USD',
  billing_cycle       text not null default 'monthly',
  next_billing_date   date,
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint subscriptions_cycle_check check (billing_cycle in ('daily','weekly','monthly','yearly'))
);

create index if not exists idx_subscriptions_user_id     on subscriptions(user_id);
create index if not exists idx_subscriptions_category_id on subscriptions(category_id);
create index if not exists idx_subscriptions_next_billing on subscriptions(next_billing_date) where active = true;

create trigger trg_subscriptions_updated_at
  before update on subscriptions
  for each row execute function set_updated_at();

alter table subscriptions enable row level security;

create policy "subscriptions_all"
  on subscriptions for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 7. NOTIFICATIONS
-- ============================================================

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  action_url  text,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_notifications_user_id    on notifications(user_id);
create index if not exists idx_notifications_unread     on notifications(user_id, read) where read = false;
create index if not exists idx_notifications_created_at on notifications(created_at desc);

alter table notifications enable row level security;

create policy "notifications_all"
  on notifications for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 8. RECEIPTS
-- Linked to expenses; storage_path points to Supabase Storage.
-- Phase 4 keeps a permissive policy (consistent with trip tables);
-- Phase 5 will tighten via trip membership checks.
-- ============================================================

create table if not exists receipts (
  id            uuid primary key default gen_random_uuid(),
  expense_id    uuid not null references expenses(id) on delete cascade,
  uploaded_by   uuid references auth.users(id) on delete set null,
  storage_path  text not null,
  file_name     text,
  file_size     bigint,
  mime_type     text,
  ocr_text      text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_receipts_expense_id   on receipts(expense_id);
create index if not exists idx_receipts_uploaded_by  on receipts(uploaded_by);

alter table receipts enable row level security;

create policy "receipts_all"
  on receipts for all
  using (true) with check (true);

-- ============================================================
-- 9. AI INSIGHTS
-- ============================================================

create table if not exists ai_insights (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          text not null,
  title         text not null,
  content       jsonb not null default '{}',
  generated_at  timestamptz not null default now(),
  expires_at    timestamptz,
  dismissed     boolean not null default false
);

create index if not exists idx_ai_insights_user_id      on ai_insights(user_id);
create index if not exists idx_ai_insights_active       on ai_insights(user_id, dismissed) where dismissed = false;
create index if not exists idx_ai_insights_expires_at   on ai_insights(expires_at);

alter table ai_insights enable row level security;

create policy "ai_insights_all"
  on ai_insights for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 10. ACTIVITY LOGS
-- Append-only audit trail. Users can read their own rows.
-- ============================================================

create table if not exists activity_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  trip_id      uuid references trips(id) on delete set null,
  action       text not null,
  entity_type  text,
  entity_id    uuid,
  metadata     jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists idx_activity_logs_user_id    on activity_logs(user_id);
create index if not exists idx_activity_logs_trip_id    on activity_logs(trip_id);
create index if not exists idx_activity_logs_created_at on activity_logs(created_at desc);

alter table activity_logs enable row level security;

-- Users read their own logs; insert is open to authenticated users (app writes these).
create policy "activity_logs_select"
  on activity_logs for select
  using (auth.uid() = user_id);

create policy "activity_logs_insert"
  on activity_logs for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- 11. TAGS
-- ============================================================

create table if not exists tags (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  color       text,
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists idx_tags_user_id on tags(user_id);

alter table tags enable row level security;

create policy "tags_all"
  on tags for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 12. EXPENSE TAGS (junction)
-- ============================================================

create table if not exists expense_tags (
  expense_id  uuid not null references expenses(id) on delete cascade,
  tag_id      uuid not null references tags(id) on delete cascade,
  primary key (expense_id, tag_id)
);

create index if not exists idx_expense_tags_tag_id on expense_tags(tag_id);

alter table expense_tags enable row level security;

-- Permissive for Phase 4; Phase 5 will add trip membership check.
create policy "expense_tags_all"
  on expense_tags for all
  using (true) with check (true);

-- ============================================================
-- 13. RECURRING EXPENSES
-- ============================================================

create table if not exists recurring_expenses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  trip_id       uuid references trips(id) on delete set null,
  category_id   uuid references categories(id) on delete set null,
  description   text not null,
  amount_cents  bigint not null,
  split_type    text not null default 'EQUAL',
  frequency     text not null,
  next_date     date not null,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  constraint recurring_expenses_freq_check check (frequency in ('daily','weekly','monthly','yearly'))
);

create index if not exists idx_recurring_expenses_user_id   on recurring_expenses(user_id);
create index if not exists idx_recurring_expenses_trip_id   on recurring_expenses(trip_id);
create index if not exists idx_recurring_expenses_next_date on recurring_expenses(next_date) where active = true;

alter table recurring_expenses enable row level security;

create policy "recurring_expenses_all"
  on recurring_expenses for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 14. TRIP COLLABORATORS
-- Enables Owner / Editor / Viewer permissions (Phase 5).
-- ============================================================

create table if not exists trip_collaborators (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references trips(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'viewer',
  invited_by  uuid references auth.users(id) on delete set null,
  joined_at   timestamptz not null default now(),
  unique (trip_id, user_id),
  constraint trip_collaborators_role_check check (role in ('owner','editor','viewer'))
);

create index if not exists idx_trip_collaborators_trip_id on trip_collaborators(trip_id);
create index if not exists idx_trip_collaborators_user_id on trip_collaborators(user_id);

alter table trip_collaborators enable row level security;

-- Permissive for Phase 4; Phase 5 replaces this with per-role policies.
create policy "trip_collaborators_all"
  on trip_collaborators for all
  using (true) with check (true);

-- ============================================================
-- Update handle_new_user trigger to also create user_settings
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

  insert into public.user_settings (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- ============================================================
-- Supabase Storage bucket for receipts (run via dashboard or API)
-- ============================================================
-- Create a private bucket named "receipts" in:
--   Storage → New bucket → Name: receipts → Public: OFF
-- Then add a storage policy allowing authenticated users to
-- upload to paths matching their user_id prefix:
--   bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]
