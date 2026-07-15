-- Table/sequence/function grants to anon/authenticated/service_role have never
-- been explicit in this migration history — they came from Supabase's "Automatically
-- expose new tables" project default (an event trigger that GRANTs on CREATE TABLE),
-- not from anything in supabase/migrations. That made grants invisible and untracked:
-- spinning up a fresh project from these migrations alone, with that default off
-- (discovered when setting up a separate dev/staging project), leaves every table
-- unreadable via the Data API with "permission denied," even though RLS policies
-- exist and are correct. RLS still does the real access control — these grants only
-- get a role past Postgres's privilege check to let RLS evaluate at all.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- The blanket "ALL FUNCTIONS" grant above would silently re-expose the cross-tenant
-- bug 0024 fixed (get_batches_ready_to_auto_close was letting any authenticated user
-- enumerate other users' batches). Re-assert that lockdown here so this migration's
-- final state is correct regardless of where it lands relative to 0024 on a fresh apply.
REVOKE EXECUTE ON FUNCTION get_batches_ready_to_auto_close() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_batches_ready_to_auto_close() TO service_role;
