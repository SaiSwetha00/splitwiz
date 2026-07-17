-- ============================================================
-- SplitWiz — Phase 9: Notifications & Activity Logs RLS
-- Run in Supabase SQL Editor after phase5-rls.sql
-- Safe to re-run (uses DROP IF EXISTS before each CREATE).
-- ============================================================

-- Enable RLS (idempotent)
alter table notifications enable row level security;
alter table activity_logs enable row level security;

-- ── Notifications ────────────────────────────────────────────
-- Inserts are done exclusively by the service-role key (admin client).
-- Authenticated users can read/update their own notifications.

drop policy if exists "notifications_select" on notifications;
drop policy if exists "notifications_update" on notifications;
drop policy if exists "notifications_delete" on notifications;

create policy "notifications_select"
  on notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "notifications_update"
  on notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notifications_delete"
  on notifications for delete
  to authenticated
  using (user_id = auth.uid());

-- ── Activity Logs ────────────────────────────────────────────
-- Inserts are done exclusively by the service-role key (admin client).
-- Authenticated users can read logs for their own trips.

drop policy if exists "activity_logs_select" on activity_logs;

create policy "activity_logs_select"
  on activity_logs for select
  to authenticated
  using (
    user_id = auth.uid()
    or
    trip_id in (
      select id from trips where user_id = auth.uid()
      union
      select trip_id from trip_collaborators where user_id = auth.uid()
    )
  );
