-- 20260728000001_fix_companies_grants.sql

-- Conceder permissão de UPDATE para a role authenticated na tabela companies
GRANT UPDATE ON public.companies TO authenticated;
GRANT DELETE ON public.companies TO authenticated;

-- Garantir que outras tabelas principais também tenham permissões para o admin fazer update (já que as RLS barram acessos indevidos)
GRANT UPDATE ON public.profiles TO authenticated;
GRANT DELETE ON public.profiles TO authenticated;

GRANT UPDATE ON public.company_members TO authenticated;
GRANT DELETE ON public.company_members TO authenticated;

GRANT UPDATE ON public.addresses TO authenticated;
GRANT DELETE ON public.addresses TO authenticated;

GRANT UPDATE ON public.company_documents TO authenticated;
GRANT DELETE ON public.company_documents TO authenticated;
