-- ============================================================
-- MIGRATION: Grant Table Privileges on storage_cleanup_tasks
-- Timestamp: 20260727210000
-- ============================================================

grant select, insert, update, delete on table public.storage_cleanup_tasks to authenticated;
grant select, insert, update, delete on table public.storage_cleanup_tasks to service_role;
