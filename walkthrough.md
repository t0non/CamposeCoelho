# Correção RLS: Recursão Infinita e Refatoração de Helpers

Implementamos a migration corretiva `20260723200000_fix_rls_infinite_recursion_final.sql`, que erradica completamente os ciclos de `infinite recursion` identificados durante os testes.

## O que foi alterado:
1. **Remoção de Subqueries (SECURITY INVOKER) nas Policies**:
   - As policies de `profiles`, `companies`, `price_tables` e `price_table_products` foram simplificadas. Removemos quaisquer consultas diretas a outras tabelas de dentro das cláusulas `USING`, pois isso acionava indiretamente outras policies e criava o ciclo vicioso.
2. **Helpers Estreitos e Seguros**:
   - Criamos funções específicas (e.g. `current_customer_price_table_id()`, `current_customer_company_id()`, `seller_can_access_company()`) para substituir a lógica complexa.
   - Todas são `SECURITY DEFINER`, `STABLE`, com `search_path = ''` e utilizam referências totalmente qualificadas.
   - Os privilégios `EXECUTE` foram revogados de `PUBLIC` e concedidos exclusivamente a `authenticated`.
3. **Scripts de Teste Blindados**:
   - `scripts/test-rls.mjs` e `scripts/test-catalog-pricing.mjs` foram atualizados para interceptar **qualquer** erro técnico não previsto (como `infinite recursion`, sintaxe SQL incorreta ou TIMEOUT) e forçar uma falha (`FAIL`), invés de silenciar ou interpretar bloqueios técnicos como sucesso de isolamento.
4. **Refinamento TypeScript**:
   - Corrigimos o retorno da query do Supabase em `app/actions/admin-catalog.ts` para permitir passagem no Type-check.

## Resultados da Regressão Automática
Todos os scripts foram re-executados e aprovados com 100% de sucesso sem ocorrências de recursão infinita:
- `node scripts/test-rls.mjs` (8/8)
- `node scripts/test-catalog-pricing.mjs` (110/110)
- `node scripts/test-http-catalog-auth.mjs` (21/21)
- `node scripts/test-company-onboarding.mjs` (30/30)
- `node scripts/test-auth.mjs` (37/37)
- Build e Type-check aprovados.

A migration local (`20260723200000_fix_rls_infinite_recursion_final.sql`) foi sincronizada perfeitamente no Supabase e confirmada pelo `migration list`.
