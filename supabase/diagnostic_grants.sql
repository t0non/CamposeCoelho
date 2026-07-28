-- CONSULTA SQL DE DIAGNÓSTICO DE PERMISSÕES (GRANTS) NA TABELA price_tables
-- Execute esta consulta no Supabase SQL Editor para verificar as permissões concedidas às roles postgres, service_role, anon e authenticated.

SELECT 
    grantee, 
    table_schema, 
    table_name, 
    privilege_type 
FROM 
    information_schema.role_table_grants 
WHERE 
    table_name = 'price_tables'
ORDER BY 
    grantee, privilege_type;

-- CONSULTA ADICIONAL DE PROPRIEDADE (OWNERSHIP) E RLS:
SELECT 
    schemaname, 
    tablename, 
    tableowner, 
    rowsecurity 
FROM 
    pg_tables 
WHERE 
    tablename = 'price_tables';

-- CONSULTA DE GRANTS PADRÃO NO SCHEMA PUBLIC:
SELECT 
    defaclrol::regrole AS granter,
    defaclnamespace::regnamespace AS schema,
    defaclobjtype AS object_type,
    defaclacl AS default_permissions
FROM 
    pg_default_acl
WHERE 
    defaclnamespace = 'public'::regnamespace;
