-- ============================================================
-- 20260722170000_fix_service_role_admin_check.sql
-- Permite que a role service_role execute alterações administrativas em profiles
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') = 'service_role'
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'::user_role
    );
$$;
