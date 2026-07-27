# Plano de Implementação Final: BLOCO 11D-D — ESTOQUE, MOVIMENTAÇÕES E TABELAS DE PREÇOS

---

## 1. Classificação dos Arquivos

| Arquivo | Classificação | Conteúdo Atual & Raciocínio de Modificação |
| :--- | :--- | :--- |
| `app/actions/inventory.ts` | **MODIFY** | **Existente**. Contém `adjustInventoryAction`. Será modificado para chamar exclusivamente a nova RPC `adjust_inventory_manual_atomic` para ajustes manuais, remover o uso de inputs arbitrários de referências e invalidar caches. |
| `app/actions/pricing.ts` | **MODIFY** | **Existente**. Contém Server Actions de tabela e preços. Será modificado para remover manipulações de status na mesma action de edição, chamar exclusivamente as novas RPCs segregadas (`update_price_table_atomic`, `set_price_table_status_atomic`, `upsert_price_entry_atomic`, `set_price_entry_status_atomic`) e processar valores monetários via parser centralizado. |
| `lib/data/admin-catalog.ts` | **MODIFY** | **Existente**. Possui as queries básicas de listagem. Será modificado para incluir paginação, buscas avançadas, ordenação e listagem do histórico imutável sem N+1. |
| `lib/validations/admin-catalog.ts` | **MODIFY** | **Existente**. Será modificado para remover `is_active` das validações de edição, endurecer a validação decimal e garantir que a promoção seja estritamente menor que o preço base. |
| `lib/utils/cache.ts` | **MODIFY** | **Existente**. Centraliza as invalidações do catálogo e tabelas de preços. |
| `lib/utils/audit.ts` | **MODIFY** | **Existente**. Contém a lista de tipos de auditoria. Será atualizado para remover `PRICE_TABLE_PRODUCT_UPSERTED` das novas operações e incluir a convenção única: `PRICE_ENTRY_CREATED`, `PRICE_ENTRY_UPDATED`, `PRICE_ENTRY_DEACTIVATED` e `PRICE_ENTRY_REACTIVATED` (observando que o tipo antigo permanece apenas para registros anteriores). |
| `app/(admin)/admin/estoque/page.tsx` | **MODIFY** | Substituir o placeholder pela listagem e controle completo de estoque e movimentações. |
| `app/(admin)/admin/tabelas-de-precos/page.tsx` | **MODIFY** | Substituir o placeholder pela listagem de tabelas de preços. |
| `app/(admin)/admin/tabelas-de-precos/nova/page.tsx` | **MODIFY** | Substituir o placeholder pelo formulário de criação de tabela. |
| `app/(admin)/admin/tabelas-de-precos/[id]/page.tsx` | **MODIFY** | Substituir pelo painel de detalhes, gerenciamento de preços por variante e controle de status. |
| `components/admin/InventoryTable.tsx` | **NEW** | Componente de exibição da listagem de inventário. |
| `components/admin/InventoryAdjustmentModal.tsx` | **NEW** | Modal de ajuste manual com cálculo de saldo previsto. |
| `components/admin/InventoryHistoryModal.tsx` | **NEW** | Modal de histórico de movimentações imutáveis. |
| `components/admin/PriceTableForm.tsx` | **NEW** | Formulário de tabela de preços (excluindo `is_default` e `is_active`). |
| `components/admin/PriceEntriesTable.tsx` | **NEW** | Componente de precificação de variantes e produtos. |
| `lib/utils/money-parser.ts` | **NEW** | Função pura centralizada de parser monetário pt-BR seguro. |

---

## 2. Auditoria Factual de Dados Existentes

* **Resultado da Consulta**: Foram encontrados **0 registros** na tabela `public.price_table_products` com `promotional_price = unit_price`.
* **Decisão**: A migration de endurecimento da restrição comercial (`<`) pode ser aplicada com segurança.

---

## 3. Estrutura do Banco de Dados e Constraints de Coerência

Criaremos uma nova migration `supabase/migrations/20260727220000_price_constraints_and_rpcs.sql`:
1. Substituir a constraint `price_table_products_promo_lte_unit` por `price_table_products_promo_lt_unit` (`promotional_price < unit_price`).
2. Adicionar check de coerência em `price_tables`:
   `starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at`
3. Adicionar check de coerência em `price_table_products`:
   `promotion_starts_at IS NULL OR promotion_ends_at IS NULL OR promotion_ends_at > promotion_starts_at`

---

## 4. Endurecimento de `adjust_inventory_atomic` e Wrapper Manual

1. **Hardened `adjust_inventory_atomic`**:
   * Substituiremos a função definindo `SET search_path = ''` e qualificando todas as tabelas e funções internas.
2. **Nova RPC `adjust_inventory_manual_atomic`**:
   * Assinatura: `public.adjust_inventory_manual_atomic(p_inventory_id uuid, p_quantity_delta integer, p_movement_type text, p_reason text)`
   * Valida se `p_movement_type` é: `'adjustment'` (com delta positivo/negativo) ou `'return'` (com delta estritamente positivo). Bloqueia qualquer outro tipo.
   * Define internamente `reference_type = 'manual'` e `reference_id = NULL`.
   * Invoca a lógica interna qualificada de `adjust_inventory_atomic`.
   * `SECURITY DEFINER`, `SET search_path = ''`, grants restritos a `authenticated` (revogado de PUBLIC/anon).

---

## 5. RPCs Transacionais de Preços (Segregação de Edição e Status)

Implementaremos RPCs com `SECURITY DEFINER`, `SET search_path = ''` e privilégios de execução restritos a `authenticated`:

1. `public.create_price_table_atomic(p_name text, p_description text, p_starts_at timestamptz, p_ends_at timestamptz)`
   * Insere em `public.price_tables` com `is_default = false` e `is_active = true`.
   * Grava 1 audit log `PRICE_TABLE_CREATED`.
2. `public.update_price_table_atomic(p_id uuid, p_name text, p_description text, p_starts_at timestamptz, p_ends_at timestamptz)`
   * Atualiza apenas `name`, `description`, `starts_at`, `ends_at` em `public.price_tables` (preserva `is_default` e `is_active`).
   * Grava 1 audit log `PRICE_TABLE_UPDATED`.
3. `public.set_price_table_status_atomic(p_id uuid, p_is_active boolean)`
   * Altera status `is_active`.
   * Grava `PRICE_TABLE_DEACTIVATED` ou `PRICE_TABLE_REACTIVATED`.
4. `public.upsert_price_entry_atomic(p_price_table_id uuid, p_product_id uuid, p_variant_id uuid, p_unit_price numeric, p_promotional_price numeric, p_promotion_starts_at timestamptz, p_promotion_ends_at timestamptz)`
   * Seleciona e bloqueia a linha correspondente com `SELECT id, is_active FROM public.price_table_products WHERE price_table_id = p_price_table_id AND product_id = p_product_id AND variant_id IS NOT DISTINCT FROM p_variant_id FOR UPDATE`.
   * **Se existir**:
     * Atualiza os valores mantendo `is_active` inalterado.
     * Grava 1 audit log `PRICE_ENTRY_UPDATED`.
   * **Se não existir**:
     * Insere nova entrada com `is_active = true`.
     * Grava 1 audit log `PRICE_ENTRY_CREATED`.
5. `public.set_price_entry_status_atomic(p_id uuid, p_is_active boolean)`
   * Altera status `is_active` da entrada.
   * Grava `PRICE_ENTRY_DEACTIVATED` ou `PRICE_ENTRY_REACTIVATED`.

---

## 6. Parser Monetário Centralizado Seguro

Lógica da função `parseBrazilianMoney(value: string): string`:
1. Remover prefixo `"R$"` e espaços.
2. Validar contra o formato `pt-BR` original (`/^\d{1,3}(\.\d{3})*,\d{2}$/` ou `/^\d+,\d{2}$/`). Se falhar, rejeita (lança erro).
3. Remover pontos de milhar.
4. Substituir a vírgula decimal por ponto.
5. Validar regex canônico final (`/^\d+\.\d{2}$/`) rejeitando NaN, Infinity, valores negativos ou notação científica.
6. Retorna a string canônica (ex: `"1234.56"`).

---

## 7. Regras de Precedência e Isolamento
* **Default Price Table**: `is_default` excluído da allowlist de formulários. Novas tabelas recebem `is_default = false`.
* **Precedência**: 1. Variante específica ➔ 2. Produto (variant_id IS NULL) ➔ 3. Min quantidade ➔ 4. Vigência da tabela e promoção.
* Empresa sem price_table_id exibe "Valor indisponível" sem fallbacks globais ou transversais.

---

## 8. Plano de Testes de Concorrência e Rollback

* **Estoque**: Executar dois ajustes simultâneos no mesmo ID no script de testes. Graças ao `FOR UPDATE`, as transações serão serializadas, resultando em saldo final exato, 2 movements e 2 audit logs individuais.
* **Preço**: Executar dois upserts simultâneos para a mesma combinação tabela/variante. A constraint de unicidade e o `FOR UPDATE` prevenirão duplicações, gerando apenas a entrada atualizada.
* **Rollback**: Testar falhas enviando valores com promoção maior que o preço normal ou ajustando estoque abaixo do reservado. Validar que nenhuma mutação parcial permanece no banco de dados e que exatamente zero audit logs são gerados.

---

## 9. Testes Manuais Focados (Apenas em Navegador Real)

Os testes manuais serão executados em navegador real, com interação real na interface, cobrindo fluxos de ajuste manual, criação de tabelas, vigências de preços/promoções, e isolamento de preços, registrando viewport, rota, ação executada, resultado visual/banco, problema e correção.

---

## 10. Regressão Final Obrigatória

* `node scripts/test-admin-catalog.mjs` (Mínimo de 145 PASS)
* `node scripts/test-http-admin-catalog.mjs` (Mínimo superior a 53 PASS)
* `node scripts/test-route-handler-images.mjs` (35/35 PASS)
* `node scripts/test-rls.mjs` (8/8 PASS)
* `npm.cmd run type-check`
* `npm.cmd run build`
* `npx.cmd supabase migration list`
