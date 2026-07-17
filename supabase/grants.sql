-- ============================================================
-- SplitWiz — PostgreSQL GRANT statements
-- Run once in the Supabase SQL Editor after applying all schema files.
-- Without these, all DB operations return "permission denied" even
-- when using the service role key, because tables were created
-- via raw SQL which does not auto-grant access to Supabase roles.
-- ============================================================

-- Schema access
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Table access for existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Sequence access (for UUID/serial primary keys)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Future tables inherit these grants automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;
