-- ============================================================
-- SplitWiz — Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor (Database → SQL Editor)
-- ============================================================

-- ============================================================
-- PHASE 2 — Core tables
-- ============================================================

create table if not exists trips (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  currency    text not null default 'USD',
  created_at  timestamptz not null default now(),
  -- user_id added in Phase 3 once auth is live:
  user_id     uuid references auth.users(id) on delete set null
);

create table if not exists members (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references trips(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists expenses (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references trips(id) on delete cascade,
  paid_by_id   uuid not null references members(id),
  description  text not null,
  amount_cents bigint not null,
  category     text,
  split_type   text not null default 'EQUAL',
  created_at   timestamptz not null default now()
);

create table if not exists expense_shares (
  id           uuid primary key default gen_random_uuid(),
  expense_id   uuid not null references expenses(id) on delete cascade,
  member_id    uuid not null references members(id),
  amount_cents bigint not null,
  unique (expense_id, member_id)
);

-- ============================================================
-- Indexes
-- ============================================================

create index if not exists idx_trips_code          on trips(code);
create index if not exists idx_members_trip_id     on members(trip_id);
create index if not exists idx_expenses_trip_id    on expenses(trip_id);
create index if not exists idx_expenses_paid_by    on expenses(paid_by_id);
create index if not exists idx_shares_expense_id   on expense_shares(expense_id);
create index if not exists idx_shares_member_id    on expense_shares(member_id);

-- ============================================================
-- Row Level Security
-- Phase 2: permissive (no user auth yet).
-- Phase 3 will replace these policies with user-scoped ones.
-- ============================================================

alter table trips          enable row level security;
alter table members        enable row level security;
alter table expenses       enable row level security;
alter table expense_shares enable row level security;

-- Allow full anonymous access while auth is not yet implemented.
create policy "anon_all" on trips          for all using (true) with check (true);
create policy "anon_all" on members        for all using (true) with check (true);
create policy "anon_all" on expenses       for all using (true) with check (true);
create policy "anon_all" on expense_shares for all using (true) with check (true);

-- ============================================================
-- PostgreSQL function: atomic expense update
-- Replaces Prisma's $transaction([deleteShares, updateExpense]).
-- ============================================================

create or replace function update_expense_with_shares(
  p_expense_id  uuid,
  p_description text,
  p_amount_cents bigint,
  p_category    text,
  p_paid_by_id  uuid,
  p_split_type  text,
  p_shares      jsonb
)
returns void
language plpgsql
security invoker
as $$
begin
  -- Delete existing shares first.
  delete from expense_shares where expense_id = p_expense_id;

  -- Update the expense itself.
  update expenses
  set
    description  = p_description,
    amount_cents = p_amount_cents,
    category     = p_category,
    paid_by_id   = p_paid_by_id,
    split_type   = p_split_type
  where id = p_expense_id;

  -- Insert the new shares.
  insert into expense_shares (expense_id, member_id, amount_cents)
  select
    p_expense_id,
    (s ->> 'member_id')::uuid,
    (s ->> 'amount_cents')::bigint
  from jsonb_array_elements(p_shares) as s;
end;
$$;
