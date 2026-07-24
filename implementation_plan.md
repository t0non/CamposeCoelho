# Fundação do Painel Administrativo (Bloco 11D-A)

## User Review Required
N/A - O plano reflete exatamente as especificações do Bloco 11D-A.

## Open Questions
N/A

## Proposed Changes

### 1. Auditoria e Estrutura
Foi constatado que as páginas sob `app/(admin)/admin` existem apenas como placeholders (`page.tsx` básicos sem CRUD). O `Zod` já está instalado no `package.json`. A RPC de estoque `adjust_inventory_atomic` já existe no banco e passou na auditoria anterior.

### 2. Autorização Centralizada e Helpers
#### [NEW] [lib/auth/admin.ts](file:///c:/Users/eduar/OneDrive/Desktop/Site-Campos-e-Coelho/app-b2b/lib/auth/admin.ts)
Centralizará `requireAdminSession()` garantindo que apenas usuários autenticados com `role = 'admin'` no banco (via SELECT em `profiles`) consigam executar mutações ou ler dados administrativos.

#### [NEW] [lib/utils/audit.ts](file:///c:/Users/eduar/OneDrive/Desktop/Site-Campos-e-Coelho/app-b2b/lib/utils/audit.ts)
Extrairemos a função `createAuditLog` já desenvolvida para um módulo dedicado, respeitando as regras de payload seguro.

#### [NEW] [lib/utils/cache.ts](file:///c:/Users/eduar/OneDrive/Desktop/Site-Campos-e-Coelho/app-b2b/lib/utils/cache.ts)
Centralizará `revalidateAdminCatalog()` invocando as tags/caminhos necessários (`/`, `/catalogo`, `/produto/[slug]`, `/admin/*`).

### 3. Validações Server-Side (Zod)
#### [NEW] [lib/validations/admin-catalog.ts](file:///c:/Users/eduar/OneDrive/Desktop/Site-Campos-e-Coelho/app-b2b/lib/validations/admin-catalog.ts)
Criação dos schemas rigorosos:
- `CategoryInput`
- `BrandInput`
- `ProductInput`
- `ProductVariantInput`
- `InventoryAdjustmentInput`
- `PriceTableInput`
- `PriceEntryInput`

### 4. Camada de Dados Administrativa
#### [NEW] [lib/data/admin-catalog.ts](file:///c:/Users/eduar/OneDrive/Desktop/Site-Campos-e-Coelho/app-b2b/lib/data/admin-catalog.ts)
Implementação de:
- `getAdminCategories()` / `getAdminCategoryById()`
- `getAdminBrands()` / `getAdminBrandById()`
- `getAdminProducts()` / `getAdminProductById()`
- `getAdminInventory()`
- `getAdminPriceTables()` / `getAdminPriceTableById()`
Todas as funções vão exigir a sessão de Admin antes de invocar as queries Supabase, com suporte a filtros e paginação.

### 5. Server Actions (Desacoplamento)
Vamos remover o arquivo provisório `admin-catalog.ts` e dividir as responsabilidades:

#### [DELETE] [app/actions/admin-catalog.ts](file:///c:/Users/eduar/OneDrive/Desktop/Site-Campos-e-Coelho/app-b2b/app/actions/admin-catalog.ts)
#### [NEW] [app/actions/catalog.ts](file:///c:/Users/eduar/OneDrive/Desktop/Site-Campos-e-Coelho/app-b2b/app/actions/catalog.ts)
Ações de Produtos, Categorias, Marcas e Variantes.
#### [NEW] [app/actions/inventory.ts](file:///c:/Users/eduar/OneDrive/Desktop/Site-Campos-e-Coelho/app-b2b/app/actions/inventory.ts)
Ações de `adjustInventoryAction` consumindo a RPC `adjust_inventory_atomic`.
#### [NEW] [app/actions/pricing.ts](file:///c:/Users/eduar/OneDrive/Desktop/Site-Campos-e-Coelho/app-b2b/app/actions/pricing.ts)
Ações de `createPriceTableAction`, `updatePriceTableAction`, e `upsertPriceEntryAction`.

Todas as Server Actions utilizarão Zod parse e gerarão logs de auditoria sem retornar erros brutos SQL.

### 6. Rotas Base (Placeholders)
Manteremos as rotas já verificadas:
- `/admin/categorias`, `/admin/marcas`, `/admin/produtos`, `/admin/estoque`, `/admin/tabelas-de-precos`
Adicionaremos `/nova` e `/[id]` apenas como placeholders estruturais para receber os futuros formulários.

## Verification Plan

### Automated Tests
Iremos readequar os testes administrativos locais:
- `node scripts/test-admin-catalog.mjs` (testando os Server Actions via import).
- `node scripts/test-http-admin-catalog.mjs` (testando acesso negado para non-admins).

Ao final, executaremos:
- `npm run type-check` e `npm run build`
- Validação completa com as demais suítes RLS já estabilizadas (`test-rls.mjs`, etc).
