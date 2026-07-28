# BLOCO 12A — CARRINHO ATÔMICO (registro de implementação)

> Este documento substitui o plano do BLOCO 11D-D (concluído e commitado em
> `5f3ab8a`) e descreve o estado real do BLOCO 12A.

---

## 1. Baseline e migrations

- **Baseline (HEAD ao iniciar 12A):** `5f3ab8a` — *feat(admin): BLOCK 11D-D*.
- **Migrations do 12A (aplicadas em Local == Remote):**
  1. `20260727270000_cart_constraints_rpcs_12a.sql` — constraints, índices únicos,
     trigger de sincronização de `profile_id`, RLS de `carts`/`cart_items`,
     helper `resolve_cart_price_canonical`, `get_active_cart_with_prices` e as
     4 RPCs atômicas (add/update/remove/clear). *(Já estava aplicada no início.)*
  2. `20260727280000_fix_cart_price_ambiguity_12a.sql` — **corretiva**. Corrige
     `ERROR 42702 column reference "unit_price" is ambiguous` em
     `resolve_cart_price_canonical` (colunas dos CTEs colidiam com os parâmetros
     OUT do `RETURNS TABLE`). Colunas qualificadas por alias.
  3. `20260727290000_fix_update_cart_item_atomic_12a.sql` — **corretiva**. Corrige
     `ERROR 55000 record "v_product" is not assigned yet` em
     `update_cart_item_atomic` (SELECT INTO gravava em campo de RECORD não
     atribuído). Introduzida variável escalar `v_product_id`.
- **Total sincronizado:** 25 migrations Local/Remote.
- As migrations já aplicadas **não** foram editadas; as correções entraram como
  novas migrations, conforme a regra de preservação.

---

## 2. Arquivos do BLOCO 12A

### Backend (SQL)
- `supabase/migrations/20260727270000_cart_constraints_rpcs_12a.sql` *(preservada)*
- `supabase/migrations/20260727280000_fix_cart_price_ambiguity_12a.sql` *(nova, corretiva)*
- `supabase/migrations/20260727290000_fix_update_cart_item_atomic_12a.sql` *(nova, corretiva)*

Objetos: RPCs `add_to_cart_atomic`, `update_cart_item_atomic`,
`remove_cart_item_atomic`, `clear_cart_atomic`; leitura set-based
`get_active_cart_with_prices`; helper interno `resolve_cart_price_canonical`
(somente `service_role`). Todas `SECURITY DEFINER`, `SET search_path = ''`, com
`REVOKE` de PUBLIC/anon nas mutações. DML direto de `authenticated` em
`carts`/`cart_items` revogado; SELECT restrito por role via RLS.

### Server Actions / validações / dados
- `app/actions/cart.ts` *(existente, preservado)* — 4 actions + mapeamento de
  códigos de erro → mensagens PT-BR; `revalidatePath('/carrinho')` apenas em
  mudança real (`changed: true`).
- `lib/validations/cart.ts` *(existente, preservado)* — schemas Zod.
- `lib/types/cart.ts` *(novo)* — tipos compartilhados `CartLineItem`/`CartSummary`
  (sem código de servidor).
- `lib/data/cart.ts` *(novo)* — `readActiveCart()` / `getActiveCartSummary()`:
  leitura set-based única via RPC, resolução de `image_url` do Storage e sinal
  de erro seguro (`ok`).

### UI
- `app/(loja)/carrinho/page.tsx` *(modificado)* — página completa: contexto de
  auth/empresa, estado vazio, itens, indisponibilidade com motivo seguro,
  subtotal estimado, aviso de confirmação, tratamento de erro sem vazar SQL,
  botão de checkout desabilitado (12B).
- `components/cart/cart-page-actions.tsx` *(existente, preservado)* — quantidade
  e remoção por item (client), com pending e erro amigável.
- `components/layout/cart-slide-over.tsx` *(modificado)* — minicart real:
  `initialItems` do servidor, sincronização via `router.refresh()`, ações
  update/remove/clear, aviso obrigatório, sem badge de "preço alterado".
- `components/layout/header.tsx` *(modificado)* — badge real (soma de unidades)
  e subtotal; repassa itens ao minicart.
- `app/(loja)/layout.tsx` *(modificado)* — resolve sessão e busca o carrinho
  set-based no servidor, repassando ao Header.
- `components/product/product-purchase-panel.tsx` *(modificado)* — botão canônico
  "Adicionar ao Pedido" ligado a `addToCartAction` (fluxo customer), com pending,
  prevenção de duplo clique, sucesso e erro de negócio; `router.refresh()`
  atualiza contador e minicart.

### Legado removido (comprovadamente órfão)
- `lib/supabase/queries/cart.ts` — leitura antiga por SELECT direto, sem
  consumidores; superada pela RPC set-based.
- `lib/mocks/mock-cart.ts` — mock do minicart, sem consumidores após o refactor.

---

## 3. Integração concluída

- **Botão adicionar:** `ProductPurchasePanel` (único botão canônico) → customer
  envia apenas `product_id`, `variant_id` (variante canônica exibida) e
  `quantity`. Nunca envia preço, `profile_id`, `price_table_id` nem
  `company_id`. Sucesso dispara `router.refresh()` → contador e minicart.
- **Minicart alimentado:** header (client) recebe do layout (server) o resumo do
  carrinho via `get_active_cart_with_prices` (uma leitura set-based). Anon,
  pendente, rejeitado e admin não têm carrinho comercial.
- **Página /carrinho:** leitura via `readActiveCart`, erro tratado com aviso
  seguro; checkout desabilitado (12B), sem criação de pedido.

---

## 4. Contexto customer × seller

- **Customer:** empresa derivada do próprio profile pela RPC; `target_company_id`
  enviado é rejeitado (FORBIDDEN).
- **Seller:** exige `target_company_id` de empresa da própria carteira. Nas telas
  atuais da **loja** não há contexto de empresa do seller, portanto o
  `add_to_cart` na página de produto pública é do fluxo **customer**. O carrinho
  do seller por empresa fica para o BLOCO 12B (rotas contextualizadas do
  vendedor). O contador do seller representa apenas a empresa selecionada.

---

## 5. Testes criados

- `scripts/test-cart.mjs` — **96 casos** (mín. 90) contra o banco remoto real:
  acesso/role, ciclo de vida do carrinho, concorrência, itens/no-ops, produto/
  variante, quantidade (min/múltiplo/zero/negativo/decimal/overflow), preço
  canônico (tiers, promoções, fallback, isolamento, nenhum fallback default),
  estoque utilizável (reservado descontado, não reserva), e segurança (DML
  direto bloqueado, helper interno inacessível, sem vazamento de SQL/segredos).
- `scripts/test-http-cart.mjs` — **24 casos** (mín. 20) contra o servidor Next:
  redirects por role (anon→login, pending→conta-pendente, rejected→conta-recusada),
  render de itens/subtotal/aviso, seller/admin, indisponibilidade, robustez de
  entrada, e ausência de HTTP 500 / vazamento de SQL/stack/segredos.

---

## 6. Regressão (todas verdes)

Cart 96/96 · HTTP Cart 24/24 · Admin Catalog 145/145 · HTTP Admin 82/82 ·
Route Handler Images 35/35 · RLS 8/8 · Catálogo e Preços 110 · HTTP Público 11/11 ·
HTTP Autenticado 21/21 · Company Onboarding 30/30 · Auth 37/37 ·
type-check 0 erros · build aprovado · migrations 25/25 Local/Remote.

---

## 7. Seleção real de variante (correção pós-relatório)

O relatório anterior confirmou que `ProductPurchasePanel` adicionava
silenciosamente `product.variants[0]`. Corrigido:

- `lib/data/products.ts` (`getProductBySlug`): não retorna mais 404 para
  produtos com zero variantes ativas; passa a computar estoque **por
  variante** (antes usava sempre `inventories[0]` para todas); resolve preço
  a nível de produto (`variant_id NULL`) quando não há variante.
- `lib/data/pricing.ts`: novo helper `getEffectiveProductLevelPriceForCurrentCustomer`
  (consulta direta restrita à sessão do cliente, sem RPC nova, sem migration).
- `app/(loja)/produto/[slug]/page.tsx`: lê `?variant=` da URL e repassa a
  `getProductBySlug` — o preço/estoque exibidos são sempre os que o
  **servidor** resolveu para aquela variante.
- `components/product/variant-selector.tsx` (novo): chips de seleção
  reaproveitando os tokens visuais existentes (bordas, laranja ativo).
- `components/product/product-purchase-panel-wrapper.tsx`: estado de seleção
  por regra de cardinalidade (0/1/2+ variantes); ao selecionar, navega via
  `router.push('?variant=<id>')` para obter preço/estoque autoritativos do
  servidor — nunca calcula preço no navegador.
- `components/product/product-pricing.tsx`: novo estado `awaitingSelection`
  (placeholder "Selecione uma opção" / "Atualizando preço..." em vez do preço
  da variante default quando não há seleção confirmada).
- `components/product/product-purchase-panel.tsx`: botão desabilitado até
  seleção explícita (2+ variantes) ou até o preço ser autoritativo; limpa
  sucesso/erro ao trocar de variante; envia `variant_id` = variante
  efetivamente selecionada (nunca por índice do array).

**Regras implementadas:**
- 0 variantes → `variant_id: null`, preço a nível de produto, adiciona normalmente.
- 1 variante ativa → seleção automática, SKU exibido, adiciona normalmente.
- 2+ variantes → botão começa desabilitado; nenhuma variante marcada por
  padrão; exige clique explícito; nunca envia `variant_id: null`; cliente
  estruturalmente só pode escolher entre variantes ativas do próprio produto
  (a lista vem de `product.variants`, já filtrada).

**Limitação conhecida:** o catálogo de seed atual não contém nenhum produto
com **zero** variantes reais, então o caminho "0 variantes" da UI não é
verificável via HTTP nesta base; foi validado no nível do backend (RPC) com
uma fixture dedicada (`CART-P-PNULL`, 0 linhas em `product_variants`).

---

## 8. Adição e carrinho (comprovação)

Comprovado por teste (`scripts/test-cart.mjs`, fixture `CART-P-TWOVAR` com
variantes A/B): variante A e variante B geram **linhas distintas** no
carrinho, com `variant_id`/SKU corretos na leitura via
`get_active_cart_with_prices`; atualizar/remover uma variante não afeta a
outra. `addToCartAction` recebe o `variant_id` selecionado pelo usuário —
nunca por índice do array.

---

## 9. Escopo do seller — divisão formal

- **Backend do carrinho do seller**: **implementado e testado** (RPCs
  `add/update/remove/clear_cart_atomic` e `get_active_cart_with_prices`
  aceitam e validam `target_company_id` da própria carteira; testes
  dedicados em `test-cart.mjs`).
- **Interface do seller para operar o carrinho de uma empresa selecionada**:
  **PENDENTE — Etapa 14.** Não há, nas telas atuais da loja, um contexto
  seguro (server-side) de "empresa atualmente selecionada pelo seller". Não
  foi inventado um seletor global de empresa neste bloco.
- **Checkout do seller**: fora do escopo do BLOCO 12A (e do 12B, que trata do
  checkout do customer).

No fluxo atual: o seller sem empresa contextualizada não vê botão de adicionar
habilitado na loja (a página de produto usa o fluxo customer); o header não
soma carrinhos de várias empresas nem exibe um carrinho vazio como se fosse de
uma empresa específica — simplesmente não popula o resumo do seller
(`getActiveCartSummary(null)` retorna vazio para seller sem `target_company_id`,
que é o estado seguro). O seller continua bloqueado de operar empresa alheia
(testado).

---

## 10. Riscos deixados para o BLOCO 12B / Etapa 14

- **Checkout / criação de pedido**: não implementado (botão desabilitado).
- **Interface do seller para carrinho por empresa**: Etapa 14 (ver seção 9).
- **Reserva de estoque**: o carrinho não reserva estoque (confirmação no
  checkout), por design.
- **Catálogo com produto de zero variantes**: caminho de UI não exercitável
  com os dados de seed atuais (ver seção 7).

---

## 11. UAT visual humana

**PENDENTE.** Testes automatizados HTTP (incluindo os novos casos do seletor
de variante) cobrem status, render, marcação `aria-checked`, e ausência de
vazamento — mas não substituem a inspeção visual humana em viewports reais
(desktop 1366px, tablet 768px, mobile 375px). Isso **não bloqueia** a
aprovação técnica do bloco.

---

## 12. Classificação

**BLOCO 12A: implementado e testado** (backend + integração + seleção real de
variante + suítes verdes), **não commitado**. Seller visual (Etapa 14) e
checkout (12B) permanecem explicitamente pendentes — não declarados como
concluídos. UAT visual humana pendente, sem bloquear a aprovação técnica.
