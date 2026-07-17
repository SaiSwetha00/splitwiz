-- ============================================================
-- SplitWiz — Phase 5: Authorization
-- Replace permissive anon_all policies with role-aware ones.
-- Run in Supabase SQL Editor AFTER phase4-schema.sql.
-- ============================================================

-- ============================================================
-- Helper: look up a user by email from auth.users
-- Called server-side when inviting a collaborator.
-- ============================================================

create or replace function lookup_user_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

-- ============================================================
-- Helper: returns the caller's role on a trip (security definer
-- so it reads trip_collaborators without RLS — prevents recursion
-- when policies on trip_collaborators call this function).
-- ============================================================

create or replace function get_trip_collaborator_role(p_trip_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from trip_collaborators
  where trip_id = p_trip_id and user_id = auth.uid()
  limit 1;
$$;

-- ============================================================
-- Helper: true when the caller may write to the given trip.
-- Anonymous trips (user_id IS NULL) are always writable.
-- Owned trips require creator / owner / editor role.
-- ============================================================

create or replace function trip_is_writable(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from trips t
    where t.id = p_trip_id
    and (
      t.user_id is null
      or t.user_id = auth.uid()
      or get_trip_collaborator_role(p_trip_id) in ('owner', 'editor')
    )
  );
$$;

-- ============================================================
-- Helper: writable check for a table whose trip is reached
-- through its expense_id FK (expense_shares, receipts, …).
-- ============================================================

create or replace function expense_trip_is_writable(p_expense_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from expenses e
    where e.id = p_expense_id
    and trip_is_writable(e.trip_id)
  );
$$;

-- ============================================================
-- Trigger: auto-register trip creator as owner in trip_collaborators
-- ============================================================

create or replace function handle_trip_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not null then
    insert into public.trip_collaborators (trip_id, user_id, role)
    values (new.id, new.user_id, 'owner')
    on conflict (trip_id, user_id) do update set role = 'owner';
  end if;
  return new;
end;
$$;

drop trigger if exists on_trip_created on trips;

create trigger on_trip_created
  after insert on trips
  for each row execute function handle_trip_created();

-- ============================================================
-- Drop old permissive policies
-- ============================================================

drop policy if exists "anon_all"             on trips;
drop policy if exists "anon_all"             on members;
drop policy if exists "anon_all"             on expenses;
drop policy if exists "anon_all"             on expense_shares;
drop policy if exists "trip_collaborators_all" on trip_collaborators;
drop policy if exists "receipts_all"         on receipts;
drop policy if exists "expense_tags_all"     on expense_tags;

-- ============================================================
-- TRIPS
-- ============================================================

-- Anyone who has the code can read.
create policy "trips_select"
  on trips for select
  using (true);

-- Authenticated users may create their own trips; anonymous trips allowed.
create policy "trips_insert"
  on trips for insert
  with check (auth.uid() = user_id or user_id is null);

-- Owner / editor can update.
create policy "trips_update"
  on trips for update
  using (
    user_id is null
    or auth.uid() = user_id
    or get_trip_collaborator_role(id) in ('owner', 'editor')
  );

-- Owner only can delete.
create policy "trips_delete"
  on trips for delete
  using (
    user_id is null
    or auth.uid() = user_id
    or get_trip_collaborator_role(id) = 'owner'
  );

-- ============================================================
-- MEMBERS
-- ============================================================

create policy "members_select"
  on members for select
  using (true);

create policy "members_insert"
  on members for insert
  with check (trip_is_writable(trip_id));

create policy "members_update"
  on members for update
  using (trip_is_writable(trip_id));

create policy "members_delete"
  on members for delete
  using (trip_is_writable(trip_id));

-- ============================================================
-- EXPENSES
-- ============================================================

create policy "expenses_select"
  on expenses for select
  using (true);

create policy "expenses_insert"
  on expenses for insert
  with check (trip_is_writable(trip_id));

create policy "expenses_update"
  on expenses for update
  using (trip_is_writable(trip_id));

create policy "expenses_delete"
  on expenses for delete
  using (trip_is_writable(trip_id));

-- ============================================================
-- EXPENSE SHARES
-- ============================================================

create policy "expense_shares_select"
  on expense_shares for select
  using (true);

create policy "expense_shares_insert"
  on expense_shares for insert
  with check (expense_trip_is_writable(expense_id));

create policy "expense_shares_update"
  on expense_shares for update
  using (expense_trip_is_writable(expense_id));

create policy "expense_shares_delete"
  on expense_shares for delete
  using (expense_trip_is_writable(expense_id));

-- ============================================================
-- TRIP COLLABORATORS
-- ============================================================

-- Collaborators and the trip creator can see the list.
create policy "trip_collaborators_select"
  on trip_collaborators for select
  using (
    auth.uid() = user_id
    or get_trip_collaborator_role(trip_id) is not null
    or exists (
      select 1 from trips t
      where t.id = trip_id and t.user_id = auth.uid()
    )
  );

-- Only owners (via trips.user_id or trip_collaborators role) may invite.
-- The on_trip_created trigger also inserts here using security definer, bypassing RLS.
create policy "trip_collaborators_insert"
  on trip_collaborators for insert
  with check (
    exists (
      select 1 from trips t where t.id = trip_id and t.user_id = auth.uid()
    )
    or get_trip_collaborator_role(trip_id) = 'owner'
  );

-- Only owners may change roles.
create policy "trip_collaborators_update"
  on trip_collaborators for update
  using (
    exists (
      select 1 from trips t where t.id = trip_id and t.user_id = auth.uid()
    )
    or get_trip_collaborator_role(trip_id) = 'owner'
  );

-- Only owners may remove collaborators.
create policy "trip_collaborators_delete"
  on trip_collaborators for delete
  using (
    exists (
      select 1 from trips t where t.id = trip_id and t.user_id = auth.uid()
    )
    or get_trip_collaborator_role(trip_id) = 'owner'
  );

-- ============================================================
-- RECEIPTS — scoped to trip editors
-- ============================================================

create policy "receipts_select"
  on receipts for select
  using (true);

create policy "receipts_insert"
  on receipts for insert
  with check (expense_trip_is_writable(expense_id));

create policy "receipts_update"
  on receipts for update
  using (expense_trip_is_writable(expense_id));

create policy "receipts_delete"
  on receipts for delete
  using (expense_trip_is_writable(expense_id));

-- ============================================================
-- EXPENSE TAGS — scoped to trip editors
-- ============================================================

create policy "expense_tags_select"
  on expense_tags for select
  using (true);

create policy "expense_tags_insert"
  on expense_tags for insert
  with check (expense_trip_is_writable(expense_id));

create policy "expense_tags_delete"
  on expense_tags for delete
  using (expense_trip_is_writable(expense_id));
