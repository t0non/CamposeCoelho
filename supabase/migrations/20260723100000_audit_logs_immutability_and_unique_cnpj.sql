-- ============================================================
-- MIGRATION: Imutabilidade de audit_logs e Unique Constraint de CNPJ
-- Timestamp: 20260723100000
-- Diagnóstico: 
-- 1) A tabela audit_logs não possuía política RLS que bloqueasse
--    DELETE para a role 'authenticated' (ou admin).
-- 2) A coluna cnpj em public.companies precisava ter garantia de UNIQUE constraint.
-- Solução:
-- 1) Garantir UNIQUE constraint em companies(cnpj).
-- 2) Revogar DELETE e UPDATE em audit_logs para authenticated e anon,
--    tornando a tabela 100% imutável via API (somente INSERT).
-- ============================================================

-- 1. Constraint de UNIQUE em companies.cnpj
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'companies_cnpj_key'
  ) then
    alter table public.companies add constraint companies_cnpj_key unique (cnpj);
  end if;
end $$;

-- 2. Revogar DELETE e UPDATE de audit_logs para authenticated e anon
revoke delete, update on public.audit_logs from authenticated, anon;

-- Garantir que a policy RLS em audit_logs proíba DELETE explicitamente
drop policy if exists "Ninguém deleta audit_logs" on public.audit_logs;
create policy "Ninguém deleta audit_logs"
  on public.audit_logs for delete
  using (false);

drop policy if exists "Ninguém atualiza audit_logs" on public.audit_logs;
create policy "Ninguém atualiza audit_logs"
  on public.audit_logs for update
  using (false);
