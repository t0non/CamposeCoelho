-- audit.sql
SELECT json_build_object(
  'policies', (
    SELECT json_agg(row_to_json(pol))
    FROM (
      SELECT tablename, policyname, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      AND tablename IN ('profiles', 'companies', 'company_members', 'price_tables', 'price_table_products')
    ) pol
  ),
  'functions', (
    SELECT json_agg(row_to_json(func))
    FROM (
      SELECT
        p.proname as function_name,
        pg_get_function_identity_arguments(p.oid) as signature,
        l.lanname as language,
        p.prosecdef as prosecdef,
        pg_get_userbyid(p.proowner) as owner,
        p.provolatile as volatility,
        p.proconfig as search_path,
        pg_get_functiondef(p.oid) as body,
        (SELECT string_agg(privilege_type || ' by ' || pg_get_userbyid(grantor) || ' to ' || pg_get_userbyid(grantee), ', ')
         FROM aclexplode(p.proacl)) as privileges
      FROM pg_proc p
      JOIN pg_language l ON p.prolang = l.oid
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname IN ('is_admin', 'is_seller', 'is_customer', 'current_profile_id', 'current_company_id', 'is_approved', 'user_belongs_to_company', 'get_my_role')
    ) func
  ),
  'tables', (
    SELECT json_agg(row_to_json(tbl))
    FROM (
      SELECT
        c.relname as tablename,
        c.relrowsecurity,
        c.relforcerowsecurity,
        pg_get_userbyid(c.relowner) as owner
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname IN ('profiles', 'companies', 'company_members', 'price_tables', 'price_table_products')
    ) tbl
  )
);
