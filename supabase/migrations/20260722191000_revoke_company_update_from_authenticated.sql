-- ============================================================
-- MIGRATION: Revogar GRANT de UPDATE em companies para authenticated
-- Timestamp: 20260722191000
-- Diagnóstico: O Supabase RLS verifica policies mas o GRANT de UPDATE
--              para 'authenticated' (concedido na migration de grants)
--              permite que qualquer usuário autenticado tente UPDATE.
--              Com o RLS usando a policy de SELECT (USING sem WITH CHECK),
--              o UPDATE passa pela USING mas não tem WITH CHECK.
-- Solução: Revogar UPDATE para authenticated em companies e re-grant
--          apenas para service_role. Customer e seller não terão
--          permissão de coluna para UPDATE, garantindo bloqueio real.
-- ============================================================

-- Revogar UPDATE de companies para authenticated (apenas service_role e admin mantêm)
revoke update on public.companies from authenticated;

-- Garantir que service_role ainda pode (usado pelo admin client server-side)
grant update on public.companies to service_role;
