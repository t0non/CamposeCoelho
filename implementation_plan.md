# Implementação do BLOCO 11D-C: Produtos, Variantes e Imagens

Este plano detalha a implementação das interfaces e da lógica administrativa para Produtos, Variantes e Imagens (BLOCO 11D-C), partindo do baseline exato exigido (`2d9b13e`), com 50/50 PASS em Admin Catalog e integrações validadas. Nenhuma exclusão física ou gerenciamento de estoque explícito será inserido neste bloco.

---

## User Review Required

> [!WARNING]
> Este plano propõe o upload de imagens de produto utilizando validação de *magic bytes* via Server Action. Como o limite nativo do Next.js App Router para bodies JSON/FormData em Server Actions é 1 MB, optaremos pela **Estratégia B (Route Handler autenticado)** para viabilizar os 5 MB do bucket, protegendo contra CSRF e validando Sessão, Product ID, Mime e Limite de Corpo estritamente, retornando JSON seguro para a UI.
> O Sr. aprova a adoção da Estratégia B (Route Handler) para o Upload?

> [!CAUTION]
> As ações de "Tornar Principal" e "Reordenar Imagens" serão realizadas via **RPC Transacional** no Supabase, garantindo atomicidade total sem múltiplos acessos round-trip e gerando exatamente 1 log por operação de negócio.

---

## Open Questions

Nenhuma no momento. O detalhamento prévio foi excelente.

---

## Proposed Changes

### 1. Auditoria dos Arquivos Existentes
Conforme orientação, avaliamos os arquivos existentes sob o prisma de **MODIFY**:
- **MODIFY** `app/(admin)/admin/produtos/page.tsx`: Existente como placeholder. Receberá listagem completa com Table, paginação, filtros e buscas (ilike).
- **MODIFY** `app/(admin)/admin/produtos/novo/page.tsx`: Existente como placeholder. Renderizará formulário base com validações Zod.
- **MODIFY** `app/(admin)/admin/produtos/[id]/page.tsx`: Existente como placeholder. Usará `await params` (Next 16) e estruturará abas virtuais (Geral, Variantes, Imagens). Retornará `notFound()` caso UUID malformado/inexistente.
- **MODIFY** `app/actions/catalog.ts`: Será preservado focado em produtos e variantes (criação, edição, publicação, ativação). Não transformaremos em monólito.
- **MODIFY** `next.config.ts`: Será atualizado APENAS caso necessite configurar limites da estratégia adotada ou hostname de imagens públicas.
- Componentes Base (`AdminPageHeader`, `Table`, `StatusBadge`, `SubmitButton`, `ConfirmStatusDialog`) serão totalmente **reutilizados**.

### 2. Schema e Banco de Dados (PostgreSQL / Storage)
- **products**: Possui `id`, `name`, `slug`, `sku`, `category_id`, `brand_id`, `is_active`, `is_published`, `min_quantity` (>0), `multiple_quantity` (>0), SEO, Descrições.
- **product_variants**: Possui `product_id`, `name`, `sku`, `attributes` (jsonb), `barcode`, `is_active`, `min_quantity`, `multiple_quantity`.
- **product_images**: Possui `product_id`, `url`, `alt_text`, `position` (>=0), `is_primary`.
- **Storage (`product-images`)**: Bucket PÚBLICO para leitura. Limite de 5MB. Mimes: jpeg, png, webp. Inserções/Atualizações bloqueadas por RLS explícito (is_admin()).

*O comportamento público é claro*: Sem Variante ativa = Sem preço (fallback "Valor Indisponível"). Rascunho = `404 Not Found` (bloqueado na raiz do RLS). Imagem principal não impede publicação, a menos que definamos estritamente (Validaremos dinamicamente).

### 3. Arquitetura das Actions
- **MODIFY** `app/actions/catalog.ts`: Centralizará as operações CRUD base. Incorporando `'use server'`.
  - `createProductAction`, `updateProductAction`, `publishProductAction`, `unpublishProductAction`, `toggleProductStatusAction`.
  - `createVariantAction`, `updateVariantAction`, `toggleVariantStatusAction`.
- **NEW** `app/actions/product-images.ts`: Módulo isolado `use server` exclusivo para imagens.
  - `updateImageAltTextAction`, `removeProductImageAction`.
- Apenas 1 (um) Audit Log imutável e transacional via DB por operação aprovada (Zero logs para constraints e rejects).

### 4. Gestão de Imagens e Atomicidade (Route Handler)
- **NEW** `app/api/admin/images/upload/route.ts`: Handler restrito para recebimento do arquivo de até 5MB. Inspeciona Magic Bytes no Buffer, checa Auth (Admin), move o Buffer via `@supabase/supabase-js` autenticado e insere no DB com transação / rollback na própria pipeline (se DB falhar, aciona `.remove()` no Storage de forma explícita).
- **NEW** `supabase/migrations/[...]`: Migration contendo **RPCs** para gerenciamento seguro:
  - `set_primary_image(image_id, product_id)`: Limpa a flag anterior e marca a nova gerando audit_log.
  - `reorder_images(json_payload)`: Reordena as posições dentro de uma transação.

### 5. Formulários, Listagens e Componentes
- **Listagem de Produtos**: Receberá queries unificadas com busca em `name`, `sku`, `slug` via `ilike` sem N+1. Paginação Server-side controlada via searchParams.
- **Criação de Produto**: Criará como rascunho por padrão. Validação de slug/sku duplicados barrados já via Zod e DB.
- **Edição ([id])**: Carrega as sessões "Geral, SEO, Variantes, Imagens". Em slug novo: revalidações disparam invalidação (404 no slug antigo).

### 6. Validação e Invalidação (Cache)
- Cache Updates via `revalidatePath('/catalogo')`, `revalidatePath('/busca')`, `revalidatePath('/')`, `revalidatePath('/admin/produtos')`.
- Rota legada de slug recebe `revalidatePath('/produto/' + oldSlug, 'page')` explícito sem criar mocks de redirecionamento.

### 7. Expansão de Regressões e Testes
Serão orquestrados **pelo menos 25 testes adicionais**:
- `scripts/test-admin-catalog.mjs`: Testes automatizados em NodeJS simulando Client Admin (sem API pública extra) para validar Produtos, Variantes (Edição cruzada, limites JSON) e Imagens (Validações de Magic Bytes e RPC Transacional). Ao fim, alcançará *75 PASS / 0 FAIL*.
- `scripts/test-http-admin-catalog.mjs`: Validação HTTP real autenticada nos novos endpoints REST e Views.

## Verification Plan

### Testes Manuais
A aprovação desta branch culminará numa sessão de validação local comprovando a navegação nos endpoints desenvolvidos:
1. Navegar por listagens paginadas responsivas;
2. Enviar JPEGs validados via *Magic Bytes* (bloqueando corrompidos);
3. Reordenar imagens comprovando a Action Atômica RPC;
4. Alternar a variante de um produto, ativando/desativando;
5. Validar deleção e compensação (Storage x DB).

### Testes Automatizados (Regressão Final)
O ciclo fechará com os comandos no Windows:
- `node scripts/test-admin-catalog.mjs` (75 PASS)
- `node scripts/test-http-admin-catalog.mjs` (Cobertura atualizada)
- Demais testes com 100% de integridade confirmada.
- `npm.cmd run type-check` (0 errors)
- `npm.cmd run build` (Sucesso Turbopack)
- `npx.cmd supabase migration list` (Sincronização atestada)
