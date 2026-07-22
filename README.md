# AtacadoB2B — Plataforma de Atacado B2B

Plataforma de comércio eletrônico para atacado B2B com controle de acesso por perfil de usuário e status de aprovação de empresa.

## Stack

| Tecnologia | Versão |
|---|---|
| Next.js | 16.2.11 (App Router) |
| React | 19 |
| TypeScript | 5 |
| Tailwind CSS | 4 |
| Supabase | 2.x (`@supabase/supabase-js`) |
| @supabase/ssr | 0.6.x |
| Zod | 3.x |
| React Hook Form | 7.x |
| Lucide React | latest |

---

## Perfis & Permissões

| Função (`role`) | Status Empresa (`company.status`) | Vê Preços | Faz Pedidos | Acesso Admin | Destino Pós-Login |
|---|---|---|---|---|---|
| `customer` | `approved` | ✅ | ✅ | ❌ | `/minha-conta` |
| `customer` | `pending` | ❌ | ❌ | ❌ | `/conta-pendente` |
| `customer` | `rejected` / `suspended` | ❌ | ❌ | ❌ | `/conta-recusada` |
| `seller` | — | ✅ | ✅ | ❌ (acesso a clientes vinculados) | `/admin` |
| `admin` | — | ✅ | ✅ | ✅ (acesso total) | `/admin` |
| Visitante (sem login) | — | ❌ | ❌ | ❌ | `/` |

---

## Instruções para Conexão Futura ao Supabase Real

### 1. Criar Projeto no Supabase
Acesse [https://supabase.com](https://supabase.com), crie um novo projeto e copie as credenciais em **Project Settings > API**.

### 2. Configurar Variáveis no `.env.local`
Crie o arquivo `.env.local` a partir do `.env.example`:

```bash
cp .env.example .env.local
```

Preencha:
- `NEXT_PUBLIC_SUPABASE_URL` = URL do projeto
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Chave Anônima Pública
- `SUPABASE_SERVICE_ROLE_KEY` = **Chave Service Role de Servidor** (nunca com prefixo `NEXT_PUBLIC_`)
- `NEXT_PUBLIC_APP_URL` = `http://localhost:3000`

### 3. Aplicar a Migração SQL
No SQL Editor do Supabase (ou via Supabase CLI), execute o script:
```sql
-- Executar o arquivo:
supabase/migrations/001_initial_schema.sql
```

### 4. Executar o Script de Seed Segura de Usuários
Para criar os usuários de testes autenticáveis no Supabase Auth com seus relacionamentos em `profiles`, `companies` e `company_members`:

```bash
npm run seed
```

**Usuários criados para desenvolvimento:**
- 🛡️ **Administrador**: `admin@atacado.com.br` | Senha: `DevelopmentPassword123!`
- 👔 **Vendedor**: `vendedor@atacado.com.br` | Senha: `DevelopmentPassword123!`
- ✅ **Cliente Aprovado**: `aprovado@cliente.com.br` | Senha: `DevelopmentPassword123!`
- ⏳ **Cliente Pendente**: `pendente@cliente.com.br` | Senha: `DevelopmentPassword123!`
- ❌ **Cliente Recusado**: `recusado@cliente.com.br` | Senha: `DevelopmentPassword123!`

---

## Desenvolvimento Local

```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Verificação estática de tipos TypeScript
npm run type-check

# Build de produção
npm run build
```

---

## Arquitetura de Segurança

- **Preços Privados**: Tabela `price_table_products` com RLS restrito a `public.is_approved()`. Visitantes não recebem valores.
- **Documentos Privados**: Tabela `company_documents` com RLS restrito à empresa proprietária e administradores.
- **Isolamento por Empresa**: Clientes consultam apenas a própria empresa e seus próprios pedidos.
- **Imutabilidade de Status**: Clientes não possuem permissão de atualizar o campo `status` de empresa/perfil via RLS.
- **Single Root Layout**: Único `app/layout.tsx` envolvendo todos os Route Groups (`(auth)`, `(loja)`, `(conta)`, `(admin)`).
