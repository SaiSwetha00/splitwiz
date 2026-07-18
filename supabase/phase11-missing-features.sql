-- ============================================================
-- SplitWiz Phase 11 — Missing Features
-- Adds: push_subscriptions, expense_comments, trip_invites,
--       trip_templates, and payment columns for Razorpay / email.
-- Safe to re-run (idempotent).
-- ============================================================

-- ── Razorpay columns on settlements ──────────────────────────
ALTER TABLE settlements
  ADD COLUMN IF NOT EXISTS razorpay_order_id   text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text,
  ADD COLUMN IF NOT EXISTS payment_status      text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_reference   text;

-- ── Email tracking on notifications ──────────────────────────
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS email_sent    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;

-- ── Push subscriptions ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   text NOT NULL UNIQUE,
  p256dh     text NOT NULL,
  auth_key   text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_push_subscriptions" ON push_subscriptions;
CREATE POLICY "users_own_push_subscriptions" ON push_subscriptions
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Expense comments ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expense_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_comments_expense_id ON expense_comments(expense_id);

ALTER TABLE expense_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expense_comments_select" ON expense_comments;
CREATE POLICY "expense_comments_select" ON expense_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM expenses e
      JOIN trips t ON t.id = e.trip_id
      WHERE e.id = expense_comments.expense_id
        AND (
          t.user_id = auth.uid()
          OR EXISTS (SELECT 1 FROM trip_members tm WHERE tm.trip_id = t.id AND tm.user_id = auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "expense_comments_insert" ON expense_comments;
CREATE POLICY "expense_comments_insert" ON expense_comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "expense_comments_delete" ON expense_comments;
CREATE POLICY "expense_comments_delete" ON expense_comments
  FOR DELETE USING (user_id = auth.uid());

-- ── Trip invites ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id    uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  token      text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL DEFAULT now() + INTERVAL '7 days',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_invites_token ON trip_invites(token);

ALTER TABLE trip_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trip_invites_select" ON trip_invites;
CREATE POLICY "trip_invites_select" ON trip_invites
  FOR SELECT USING (true);  -- anyone with token can read to join

DROP POLICY IF EXISTS "trip_invites_insert" ON trip_invites;
CREATE POLICY "trip_invites_insert" ON trip_invites
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- ── Trip templates ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  trip_type    text,
  default_currency text NOT NULL DEFAULT 'INR',
  member_names text[] NOT NULL DEFAULT '{}',
  categories   text[] NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE trip_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trip_templates_owner" ON trip_templates;
CREATE POLICY "trip_templates_owner" ON trip_templates
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
