# PROMPT — Painel do Admin (Vendedor) Completo
## Para: Cursor / VS Code AI
## Baseado na análise completa da planilha Excel original

---

## ANÁLISE DA PLANILHA — O QUE É FIXO vs CONFIGURÁVEL

Após análise das 9 abas (incluindo as 4 ocultas), identifiquei o seguinte:

### 🔒 VALORES FIXOS (iguais para todos os salões, o admin NÃO cadastra)

Estes valores estão hardcoded nas fórmulas do Excel e não variam:

```javascript
// Horários da agenda — sempre 08:00 às 19:00, de 30 em 30 min
const HORARIOS = ['08:00','08:30','09:00','09:30','10:00','10:30',
  '11:00','11:30','12:00','12:30','13:00','13:30',
  '14:00','14:30','15:00','15:30','16:00','16:30',
  '17:00','17:30','18:00','18:30','19:00'];

// Acréscimo de comprimento — fórmulas J4% e J5% da aba VALORES
const ACRESCIMO_M = 20; // cabelo médio = preço_p × 1.20
const ACRESCIMO_G = 30; // cabelo grande = preço_p × 1.30

// Taxa da maquininha — /95% nas fórmulas do CONTROLE
const TAXA_MAQUININHA = 5; // 5% sobre tudo

// Referência de capacidade mensal (aba VALORES, células L9 e L10)
const QTD_CABELOS_MES = 100;  // para calcular custo fixo por atendimento
const QTD_DIAS_MES    = 22;

// Status possíveis de atendimento
const STATUS = ['AGENDADO', 'EXECUTADO', 'CANCELADO'];

// Categorias de procedimentos (fixas no sistema)
const CATEGORIAS = ['CABELO', 'UNHAS', 'SOBRANCELHAS', 'CILIOS', 'OUTRO'];

// Tipos de despesa (fixos)
const TIPOS_DESPESA = ['ALUGUEL','ENERGIA','AGUA','INTERNET',
  'MATERIAL','EQUIPAMENTO','FORNECEDOR','FUNCIONARIO','OUTRO'];
```

### ⚙️ O QUE O ADMIN CADASTRA (configurável por salão)

Tudo abaixo varia de salão para salão e é configurado pelo admin:

**1. Dados do salão** — nome, telefone, email, endereço

**2. Configurações financeiras:**
- Custo fixo por atendimento (padrão: R$29,00 — calculado como aluguel ÷ 100 atendimentos/mês)
- % de comissão padrão das profissionais (padrão: 40%)

**3. Profissionais** — nome, cargo, salário fixo mensal:
- Cargo PROPRIETARIO: sem salário fixo (retira via pró-labore)
- Cargo FUNCIONARIO: salário fixo mensal (ex: Yara=R$900, Geovana=R$560, Quinha=R$230, Mirelly=R$800)

**4. Procedimentos** com preços — extraídos da aba VALORES:
- Nome, categoria, se requer comprimento (P/M/G)
- Preço base (P), custo do produto (variável), % comissão da profissional
- Preços M e G são calculados automaticamente: M = P × 1.20, G = P × 1.30
  EXCETO Luzes e Coloração que têm preços próprios (não seguem a regra de 20%/30%)

**5. Produtos químicos do salão** (aba VALORES, seção "PRODUTOS DE SALAO BASE"):
- Cada produto tem: nome, valor total da embalagem, quantidade de aplicações por embalagem
- Custo por aplicação = valor ÷ qtd aplicações
- Esses custos alimentam o custo variável de cada procedimento

**6. Despesas fixas mensais** (aba VALORES, seção "CUSTOS FIXOS"):
- Aluguel, energia, água, internet, produtos de limpeza, alimentação do estúdio, sistema, acessórios

**7. Login da proprietária** — email e senha definidos presencialmente entre admin e proprietária

---

## FLUXO COMPLETO DO ADMIN

```
PASSO 1: Admin loga → detecta role=VENDEDOR → VendedorApp
PASSO 2: Admin clica "Novo Salão"
PASSO 3: Wizard de 5 etapas:
  Etapa 1 — Dados do salão (nome, telefone, email, endereço)
  Etapa 2 — Profissionais (adicionar cada uma com nome, cargo, salário)
  Etapa 3 — Procedimentos (selecionar da lista padrão + ajustar preços)
  Etapa 4 — Despesas fixas mensais (aluguel, energia, etc.)
  Etapa 5 — Criar login da proprietária (email + senha)
PASSO 4: Salão criado → admin entrega acesso para a proprietária
PASSO 5: Proprietária faz login → acesso total ao sistema do salão dela
```

---

## BANCO DE DADOS — SQL COMPLETO

Execute no Supabase SQL Editor **antes** de implementar o frontend:

```sql
-- ============================================================
-- SCHEMA ATUALIZADO COM SUPORTE AO ADMIN
-- ============================================================

-- Tabela de salões
create table if not exists saloes (
  id          uuid primary key default uuid_generate_v4(),
  vendedor_id uuid references auth.users(id) on delete set null,
  nome        text not null,
  telefone    text,
  email       text,
  endereco    text,
  descricao   text,
  ativo       boolean not null default true,
  criado_em   timestamptz default now()
);

-- RLS: vendedor vê apenas seus salões
alter table saloes enable row level security;
create policy "vendedor_seus_saloes" on saloes
  for all to authenticated
  using (
    vendedor_id = auth.uid()
    or exists (
      select 1 from profiles
      where id = auth.uid() and salao_id = saloes.id
    )
  );

-- Tabela de perfis de acesso
create table if not exists profiles (
  id        uuid primary key references auth.users(id) on delete cascade,
  salao_id  uuid references saloes(id) on delete cascade,
  role      text not null check (role in ('VENDEDOR','PROPRIETARIO','FUNCIONARIO')),
  nome      text,
  criado_em timestamptz default now()
);

alter table profiles enable row level security;
create policy "profiles_proprios" on profiles
  for all to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and (p.role = 'VENDEDOR' or p.salao_id = profiles.salao_id)
    )
  );

-- Configurações do salão (1 linha por salão)
create table if not exists configuracoes (
  id                        int primary key default 1,
  salao_id                  uuid unique references saloes(id) on delete cascade,
  nome_salao                text,
  custo_fixo_por_atendimento numeric(10,2) not null default 29.00,
  taxa_maquininha_pct        numeric(5,2)  not null default 5.00,
  porcentagem_profissional   numeric(5,2)  not null default 40.00,
  prolabore_mensal           numeric(10,2) default 0
);

alter table configuracoes enable row level security;
create policy "auth_cfg" on configuracoes
  for all to authenticated
  using (
    salao_id = (select salao_id from profiles where id = auth.uid())
    or exists (select 1 from saloes s join profiles p on p.id = auth.uid()
               where p.role = 'VENDEDOR' and s.vendedor_id = auth.uid()
               and s.id = configuracoes.salao_id)
  );

-- Profissionais
create table if not exists profissionais (
  id            uuid primary key default uuid_generate_v4(),
  salao_id      uuid not null references saloes(id) on delete cascade,
  nome          text not null,
  cargo         text not null check (cargo in ('PROPRIETARIO','FUNCIONARIO')),
  salario_fixo  numeric(10,2) not null default 0,
  ativo         boolean not null default true,
  criado_em     timestamptz default now()
);

alter table profissionais enable row level security;
create policy "auth_prof" on profissionais
  for all to authenticated
  using (
    salao_id = (select salao_id from profiles where id = auth.uid())
    or exists (select 1 from saloes s join profiles p on p.id = auth.uid()
               where p.role = 'VENDEDOR' and s.vendedor_id = auth.uid()
               and s.id = profissionais.salao_id)
  );

-- Procedimentos
create table if not exists procedimentos (
  id                       uuid primary key default uuid_generate_v4(),
  salao_id                 uuid not null references saloes(id) on delete cascade,
  nome                     text not null,
  categoria                text not null default 'CABELO'
                           check (categoria in ('CABELO','UNHAS','SOBRANCELHAS','CILIOS','OUTRO')),
  requer_comprimento       boolean not null default true,
  preco_p                  numeric(10,2),
  preco_m                  numeric(10,2),   -- se null, calculado como preco_p × 1.20
  preco_g                  numeric(10,2),   -- se null, calculado como preco_p × 1.30
  custo_variavel           numeric(10,2) not null default 0,
  porcentagem_profissional numeric(5,2)  not null default 40,
  ativo                    boolean not null default true,
  criado_em                timestamptz default now()
);

alter table procedimentos enable row level security;
create policy "auth_proc" on procedimentos
  for all to authenticated
  using (
    salao_id = (select salao_id from profiles where id = auth.uid())
    or exists (select 1 from saloes s join profiles p on p.id = auth.uid()
               where p.role = 'VENDEDOR' and s.vendedor_id = auth.uid()
               and s.id = procedimentos.salao_id)
  );

-- Despesas fixas mensais (configuradas pelo admin, ajustadas pela proprietária)
create table if not exists despesas (
  id          uuid primary key default uuid_generate_v4(),
  salao_id    uuid not null references saloes(id) on delete cascade,
  data        date not null,
  descricao   text not null,
  tipo        text not null default 'OUTRO'
              check (tipo in ('ALUGUEL','ENERGIA','AGUA','INTERNET','MATERIAL',
                              'EQUIPAMENTO','FORNECEDOR','FUNCIONARIO','OUTRO')),
  valor       numeric(10,2) not null,
  pago        boolean not null default false,
  criado_em   timestamptz default now()
);

alter table despesas enable row level security;
create policy "auth_desp" on despesas
  for all to authenticated
  using (
    salao_id = (select salao_id from profiles where id = auth.uid())
    or exists (select 1 from saloes s join profiles p on p.id = auth.uid()
               where p.role = 'VENDEDOR' and s.vendedor_id = auth.uid()
               and s.id = despesas.salao_id)
  );

-- Atendimentos
create table if not exists atendimentos (
  id                  uuid primary key default uuid_generate_v4(),
  salao_id            uuid not null references saloes(id) on delete cascade,
  data                date not null,
  horario             time not null,
  profissional_id     uuid not null references profissionais(id),
  procedimento_id     uuid not null references procedimentos(id),
  comprimento         text check (comprimento in ('P','M','G')),
  cliente             text not null,
  valor_cobrado       numeric(10,2),
  valor_maquininha    numeric(10,2),
  valor_profissional  numeric(10,2),
  custo_fixo          numeric(10,2),
  custo_variavel      numeric(10,2),
  lucro_liquido       numeric(10,2),
  lucro_possivel      numeric(10,2),
  pago                boolean not null default false,
  executado           boolean not null default false,
  status              text not null default 'AGENDADO'
                      check (status in ('AGENDADO','EXECUTADO','CANCELADO')),
  obs                 text,
  criado_em           timestamptz default now(),
  atualizado_em       timestamptz default now()
);

create index if not exists idx_atend_data       on atendimentos(salao_id, data);
create index if not exists idx_atend_status     on atendimentos(salao_id, status);

alter table atendimentos enable row level security;
create policy "auth_atend" on atendimentos
  for all to authenticated
  using (salao_id = (select salao_id from profiles where id = auth.uid()));

-- Home Car
create table if not exists homecare (
  id              uuid primary key default uuid_generate_v4(),
  salao_id        uuid not null references saloes(id) on delete cascade,
  data            date not null,
  cliente         text not null,
  produto         text not null,
  custo_produto   numeric(10,2) not null default 0,
  valor_venda     numeric(10,2) not null,
  valor_pago      numeric(10,2) not null default 0,
  valor_pendente  numeric(10,2) generated always as (valor_venda - valor_pago) stored,
  lucro           numeric(10,2) generated always as (valor_venda - custo_produto) stored,
  obs             text,
  criado_em       timestamptz default now()
);

alter table homecare enable row level security;
create policy "auth_home" on homecare
  for all to authenticated
  using (salao_id = (select salao_id from profiles where id = auth.uid()));

-- Procedimentos paralelos
create table if not exists procedimentos_paralelos (
  id              uuid primary key default uuid_generate_v4(),
  salao_id        uuid not null references saloes(id) on delete cascade,
  data            date not null,
  profissional_id uuid references profissionais(id),
  descricao       text not null,
  cliente         text not null,
  valor           numeric(10,2) not null,
  valor_pago      numeric(10,2) not null default 0,
  valor_pendente  numeric(10,2) generated always as (valor - valor_pago) stored,
  criado_em       timestamptz default now()
);

alter table procedimentos_paralelos enable row level security;
create policy "auth_para" on procedimentos_paralelos
  for all to authenticated
  using (salao_id = (select salao_id from profiles where id = auth.uid()));

-- Gastos pessoais da proprietária (pró-labore)
create table if not exists gastos_pessoais (
  id          uuid primary key default uuid_generate_v4(),
  salao_id    uuid not null references saloes(id) on delete cascade,
  descricao   text not null,
  valor       numeric(10,2) not null default 0,
  criado_em   timestamptz default now()
);

alter table gastos_pessoais enable row level security;
create policy "auth_gastos" on gastos_pessoais
  for all to authenticated
  using (salao_id = (select salao_id from profiles where id = auth.uid()));

-- ============================================================
-- TRIGGER — Calcular valores do atendimento automaticamente
-- ============================================================
create or replace function fn_calcular_atendimento()
returns trigger language plpgsql as $$
declare
  v_proc procedimentos%rowtype;
  v_cfg  configuracoes%rowtype;
  v_preco numeric(10,2);
begin
  select * into v_proc from procedimentos where id = new.procedimento_id;
  select * into v_cfg  from configuracoes  where salao_id = new.salao_id;

  -- Preço base por comprimento
  if not v_proc.requer_comprimento or new.comprimento = 'P' then
    v_preco := v_proc.preco_p;
  elsif new.comprimento = 'M' then
    v_preco := coalesce(v_proc.preco_m, round(v_proc.preco_p * 1.20, 2));
  elsif new.comprimento = 'G' then
    v_preco := coalesce(v_proc.preco_g, round(v_proc.preco_p * 1.30, 2));
  else
    v_preco := v_proc.preco_p;
  end if;

  if new.valor_cobrado is null then new.valor_cobrado := v_preco; end if;

  new.valor_maquininha   := round(new.valor_cobrado * coalesce(v_cfg.taxa_maquininha_pct, 5) / 100, 2);
  new.valor_profissional := round(new.valor_cobrado * v_proc.porcentagem_profissional / 100, 2);
  new.custo_fixo         := coalesce(v_cfg.custo_fixo_por_atendimento, 29);
  new.custo_variavel     := v_proc.custo_variavel;
  new.lucro_liquido      := new.valor_cobrado - new.valor_maquininha - new.valor_profissional
                            - new.custo_fixo - new.custo_variavel;
  new.lucro_possivel     := new.valor_cobrado - new.valor_profissional
                            - new.custo_fixo - new.custo_variavel;

  if new.status = 'CANCELADO' then
    new.valor_maquininha := 0; new.valor_profissional := 0;
    new.lucro_liquido    := 0; new.lucro_possivel     := 0;
  end if;

  new.atualizado_em := now();
  return new;
end;
$$;

create trigger trg_calcular_atendimento
  before insert or update on atendimentos
  for each row execute function fn_calcular_atendimento();

-- ============================================================
-- FUNCTION — Deletar salão completamente (cascade)
-- Chamada pela Edge Function do admin
-- ============================================================
create or replace function deletar_salao_completo(p_salao_id uuid)
returns void language plpgsql security definer as $$
begin
  -- Deleta tudo em cascata (as FKs com ON DELETE CASCADE cuidam do resto)
  delete from saloes where id = p_salao_id;
end;
$$;
```

---

## EDGE FUNCTIONS — Supabase (operações que precisam de service_role)

### `supabase/functions/criar-usuario-salao/index.ts`

O admin não pode criar usuários diretamente do frontend (exige service_role key). Esta função resolve isso:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { email, senha, nome, salao_id, role } = await req.json()

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 1. Cria o usuário com email + senha definidos pelo admin
  const { data: user, error: errUser } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,   // já confirma o email automaticamente
    user_metadata: { nome, salao_id, role }
  })

  if (errUser) return new Response(JSON.stringify({ error: errUser.message }), { status: 400 })

  // 2. Cria o perfil de acesso
  await admin.from('profiles').insert({
    id: user.user.id,
    salao_id,
    role,
    nome
  })

  // 3. Se for profissional, cadastra também na tabela de profissionais
  if (role !== 'VENDEDOR') {
    await admin.from('profissionais').insert({
      salao_id,
      nome,
      cargo: role,
      salario_fixo: 0,
      ativo: true
    })
  }

  return new Response(JSON.stringify({ user_id: user.user.id }), { status: 200 })
})
```

### `supabase/functions/deletar-salao/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { salao_id } = await req.json()

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Deleta todos os usuários desse salão do Auth
  const { data: perfis } = await admin.from('profiles').select('id').eq('salao_id', salao_id)
  for (const p of (perfis || [])) {
    await admin.auth.admin.deleteUser(p.id)
  }

  // Deleta o salão (cascade apaga o resto)
  await admin.from('saloes').delete().eq('id', salao_id)

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})
```

---

## FRONTEND — ARQUIVOS A CRIAR/MODIFICAR

### Estrutura de arquivos:

```
src/
├── App.jsx                        ← modificar: detectar VENDEDOR
├── vendedor/
│   ├── VendedorApp.jsx            ← roteador do admin
│   ├── VendedorSidebar.jsx        ← sidebar visual diferente
│   ├── MeusSaloes.jsx             ← lista e cards de salões
│   └── NovoSalao.jsx              ← wizard de 5 etapas
└── [arquivos existentes do salão]
```

---

### `src/App.jsx` — modificação

Onde hoje redireciona para `/dashboard`, adicionar detecção do vendedor:

```jsx
// Após carregar o perfil:
if (role === 'VENDEDOR') return <VendedorApp email={email} />;
// resto do código existente...
```

---

### `src/vendedor/VendedorApp.jsx`

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import VendedorSidebar from './VendedorSidebar';
import MeusSaloes from './MeusSaloes';
import NovoSalao from './NovoSalao';

export default function VendedorApp({ email }) {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-slate-50">
        <VendedorSidebar email={email} />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/admin/saloes"     element={<MeusSaloes />} />
            <Route path="/admin/novo-salao" element={<NovoSalao />} />
            <Route path="*"                element={<Navigate to="/admin/saloes" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
```

---

### `src/vendedor/VendedorSidebar.jsx`

Visual diferente do salão — fundo azul escuro para distinguir claramente:

```jsx
import { NavLink } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function VendedorSidebar({ email }) {
  return (
    <aside className="w-56 min-h-screen bg-slate-900 flex flex-col">
      {/* Badge identificador */}
      <div className="px-5 py-5 border-b border-slate-700">
        <div className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded mb-3 inline-block">
          PAINEL DO ADMIN
        </div>
        <p className="text-xs text-slate-400 truncate">{email}</p>
      </div>

      <nav className="flex-1 py-4 space-y-0.5 px-2">
        <NavLink to="/admin/saloes"
          className={({ isActive }) =>
            `block px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive ? 'bg-white text-slate-900 font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}>
          Meus Salões
        </NavLink>
        <NavLink to="/admin/novo-salao"
          className={({ isActive }) =>
            `block px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive ? 'bg-white text-slate-900 font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}>
          + Novo Salão
        </NavLink>
      </nav>

      <div className="px-4 py-4 border-t border-slate-700">
        <button onClick={() => supabase.auth.signOut()}
          className="w-full text-xs text-slate-500 hover:text-slate-300 text-left">
          Sair
        </button>
      </div>
    </aside>
  );
}
```

---

### `src/vendedor/MeusSaloes.jsx`

Lista todos os salões do admin com opção de editar e deletar:

```jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function MeusSaloes() {
  const [saloes, setSaloes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('saloes')
      .select(`*, profissionais(count), procedimentos(count)`)
      .order('criado_em', { ascending: false });
    setSaloes(data || []);
    setLoading(false);
  };

  const deletar = async (id, nome) => {
    if (!confirm(`Deletar "${nome}" permanentemente?\n\nTodos os dados serão apagados: profissionais, atendimentos, financeiro. Esta ação não pode ser desfeita.`)) return;
    
    // Chama a Edge Function que apaga tudo incluindo usuários do Auth
    const { error } = await supabase.functions.invoke('deletar-salao', {
      body: { salao_id: id }
    });

    if (error) { alert('Erro ao deletar: ' + error.message); return; }
    carregar();
  };

  if (loading) return <div className="p-6 text-sm text-slate-400">Carregando...</div>;

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Meus Salões</h1>
        <a href="/admin/novo-salao"
          className="bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-900">
          + Novo Salão
        </a>
      </div>

      {saloes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400 text-sm">Nenhum salão cadastrado ainda.</p>
          <a href="/admin/novo-salao"
            className="mt-4 inline-block bg-slate-800 text-white text-sm px-6 py-2 rounded-lg hover:bg-slate-900">
            Cadastrar primeiro salão
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {saloes.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="font-semibold text-slate-800">{s.nome}</h2>
                  {s.telefone && <p className="text-xs text-slate-400 mt-0.5">{s.telefone}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  s.ativo ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {s.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="flex gap-4 text-xs text-slate-500 mb-4">
                <span>{s.profissionais?.[0]?.count || 0} profissionais</span>
                <span>{s.procedimentos?.[0]?.count || 0} procedimentos</span>
              </div>

              <div className="flex gap-2">
                <a href={`/admin/gerenciar/${s.id}`}
                  className="flex-1 text-center text-xs border border-slate-200 rounded-lg py-1.5 hover:bg-slate-50">
                  Gerenciar
                </a>
                <button
                  onClick={() => deletar(s.id, s.nome)}
                  className="text-xs border border-red-200 text-red-600 rounded-lg px-3 py-1.5 hover:bg-red-50">
                  Deletar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

### `src/vendedor/NovoSalao.jsx` — Wizard de 5 etapas

Este é o arquivo mais importante. Implementar como um wizard com etapas sequenciais:

```jsx
// Estrutura geral do wizard
export default function NovoSalao() {
  const [etapa, setEtapa] = useState(1);
  const [salaoId, setSalaoId] = useState(null);

  // Dados de cada etapa
  const [dadosSalao, setDadosSalao] = useState({
    nome: '', telefone: '', email: '', endereco: '', descricao: ''
  });
  const [profissionais, setProfissionais] = useState([
    { nome: '', cargo: 'PROPRIETARIO', salario_fixo: 0 }
  ]);
  const [procedimentos, setProcedimentos] = useState([]); // começa vazio, admin seleciona da lista
  const [despesas, setDespesas] = useState([
    { descricao: 'Aluguel',           tipo: 'ALUGUEL',    valor: 0 },
    { descricao: 'Energia',           tipo: 'ENERGIA',    valor: 0 },
    { descricao: 'Água',              tipo: 'AGUA',       valor: 0 },
    { descricao: 'Internet',          tipo: 'INTERNET',   valor: 0 },
    { descricao: 'Produtos Limpeza',  tipo: 'MATERIAL',   valor: 0 },
    { descricao: 'Alimentação',       tipo: 'MATERIAL',   valor: 0 },
    { descricao: 'Sistema',           tipo: 'EQUIPAMENTO',valor: 0 },
    { descricao: 'Acessórios',        tipo: 'EQUIPAMENTO',valor: 0 },
  ]);
  const [loginProprietaria, setLoginProprietaria] = useState({ email: '', senha: '', nome: '' });

  // Renderizar barra de progresso + etapa atual
  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-semibold text-slate-800 mb-2">Novo Salão</h1>
      
      {/* Barra de progresso */}
      <div className="flex gap-2 mb-8">
        {['Dados', 'Profissionais', 'Serviços', 'Despesas', 'Acesso'].map((label, i) => (
          <div key={i} className="flex-1">
            <div className={`h-1.5 rounded-full ${i + 1 <= etapa ? 'bg-slate-800' : 'bg-slate-200'}`} />
            <p className={`text-[10px] mt-1 ${i + 1 === etapa ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {etapa === 1 && <Etapa1Dados dados={dadosSalao} onChange={setDadosSalao} onNext={() => setEtapa(2)} />}
      {etapa === 2 && <Etapa2Profissionais lista={profissionais} onChange={setProfissionais} onNext={() => setEtapa(3)} onBack={() => setEtapa(1)} />}
      {etapa === 3 && <Etapa3Procedimentos lista={procedimentos} onChange={setProcedimentos} onNext={() => setEtapa(4)} onBack={() => setEtapa(2)} />}
      {etapa === 4 && <Etapa4Despesas lista={despesas} onChange={setDespesas} onNext={() => setEtapa(5)} onBack={() => setEtapa(3)} />}
      {etapa === 5 && <Etapa5Acesso dados={loginProprietaria} onChange={setLoginProprietaria}
        dadosSalao={dadosSalao} profissionais={profissionais}
        procedimentos={procedimentos} despesas={despesas}
        onBack={() => setEtapa(4)} />}
    </div>
  );
}
```

**Detalhes de cada etapa:**

**Etapa 1 — Dados do Salão:**
```jsx
function Etapa1Dados({ dados, onChange, onNext }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <h2 className="font-medium text-slate-700">Dados do salão</h2>
      <div>
        <label className="text-xs text-slate-600 block mb-1">Nome do salão *</label>
        <input required type="text" value={dados.nome}
          onChange={e => onChange({...dados, nome: e.target.value})}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          placeholder="Ex: Studio Belle" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-slate-600 block mb-1">Telefone</label>
          <input type="text" value={dados.telefone}
            onChange={e => onChange({...dados, telefone: e.target.value})}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            placeholder="(11) 99999-9999" />
        </div>
        <div>
          <label className="text-xs text-slate-600 block mb-1">E-mail de contato</label>
          <input type="email" value={dados.email}
            onChange={e => onChange({...dados, email: e.target.value})}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label className="text-xs text-slate-600 block mb-1">Endereço</label>
        <input type="text" value={dados.endereco}
          onChange={e => onChange({...dados, endereco: e.target.value})}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div className="flex justify-end pt-2">
        <button onClick={onNext} disabled={!dados.nome}
          className="bg-slate-800 text-white text-sm px-6 py-2.5 rounded-lg disabled:opacity-40">
          Próximo →
        </button>
      </div>
    </div>
  );
}
```

**Etapa 2 — Profissionais:**
```jsx
// Lista de profissionais com botão "Adicionar profissional"
// Cada linha: nome + cargo (PROPRIETARIO/FUNCIONARIO) + salário fixo
// Pelo menos 1 PROPRIETARIO obrigatório
function Etapa2Profissionais({ lista, onChange, onNext, onBack }) {
  const adicionar = () => onChange([...lista, { nome: '', cargo: 'FUNCIONARIO', salario_fixo: 0 }]);
  const remover  = (i) => onChange(lista.filter((_, j) => j !== i));
  const editar   = (i, campo, val) => {
    const nova = [...lista];
    nova[i][campo] = val;
    onChange(nova);
  };

  const temProprietario = lista.some(p => p.cargo === 'PROPRIETARIO');
  const valido = lista.length > 0 && lista.every(p => p.nome.trim()) && temProprietario;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="font-medium text-slate-700 mb-4">Profissionais da equipe</h2>
      <p className="text-xs text-slate-500 mb-4">
        Adicione todas as profissionais. Pelo menos uma deve ser Proprietária.
      </p>

      <div className="space-y-3">
        {lista.map((p, i) => (
          <div key={i} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-slate-500 block mb-1">Nome</label>
              <input type="text" value={p.nome} placeholder="Nome da profissional"
                onChange={e => editar(i, 'nome', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="w-40">
              <label className="text-xs text-slate-500 block mb-1">Cargo</label>
              <select value={p.cargo} onChange={e => editar(i, 'cargo', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <option value="PROPRIETARIO">Proprietária</option>
                <option value="FUNCIONARIO">Funcionária</option>
              </select>
            </div>
            <div className="w-32">
              <label className="text-xs text-slate-500 block mb-1">Salário fixo</label>
              <input type="number" step="0.01"
                value={p.cargo === 'PROPRIETARIO' ? '' : p.salario_fixo}
                disabled={p.cargo === 'PROPRIETARIO'}
                onChange={e => editar(i, 'salario_fixo', Number(e.target.value))}
                placeholder="R$ 0"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400" />
            </div>
            {lista.length > 1 && (
              <button onClick={() => remover(i)}
                className="text-red-400 hover:text-red-600 pb-2 text-sm">✕</button>
            )}
          </div>
        ))}
      </div>

      {!temProprietario && (
        <p className="text-xs text-red-500 mt-2">⚠ Adicione pelo menos uma Proprietária</p>
      )}

      <button onClick={adicionar}
        className="mt-4 text-sm text-slate-600 border border-slate-200 rounded-lg px-4 py-2 hover:bg-slate-50">
        + Adicionar profissional
      </button>

      <div className="flex justify-between pt-6">
        <button onClick={onBack} className="text-sm text-slate-500 border border-slate-200 rounded-lg px-5 py-2">← Voltar</button>
        <button onClick={onNext} disabled={!valido}
          className="bg-slate-800 text-white text-sm px-6 py-2.5 rounded-lg disabled:opacity-40">
          Próximo →
        </button>
      </div>
    </div>
  );
}
```

**Etapa 3 — Procedimentos e Preços:**
```jsx
// Lista de procedimentos pré-definidos (baseada na planilha)
const PROCEDIMENTOS_PADRAO = [
  { nome: 'Progressiva',       categoria: 'CABELO',       requer_comprimento: true,  preco_p: 130, custo_variavel: 50, porcentagem_profissional: 40 },
  { nome: 'Botox',             categoria: 'CABELO',       requer_comprimento: true,  preco_p: 100, custo_variavel: 40, porcentagem_profissional: 40 },
  { nome: 'Coloração',         categoria: 'CABELO',       requer_comprimento: true,  preco_p: 65,  preco_m: 80, preco_g: 95, custo_variavel: 28, porcentagem_profissional: 40 },
  { nome: 'Luzes',             categoria: 'CABELO',       requer_comprimento: true,  preco_p: 120, preco_m: 180, preco_g: 230, custo_variavel: 45, porcentagem_profissional: 40 },
  { nome: 'Fusion',            categoria: 'CABELO',       requer_comprimento: true,  preco_p: 50,  custo_variavel: 20, porcentagem_profissional: 40 },
  { nome: 'Hidratação',        categoria: 'CABELO',       requer_comprimento: true,  preco_p: 45,  custo_variavel: 15, porcentagem_profissional: 40 },
  { nome: 'Reconstrução',      categoria: 'CABELO',       requer_comprimento: true,  preco_p: 75,  custo_variavel: 25, porcentagem_profissional: 40 },
  { nome: 'Kit Lavatório',     categoria: 'CABELO',       requer_comprimento: true,  preco_p: 35,  custo_variavel: 10, porcentagem_profissional: 40 },
  { nome: 'Detox',             categoria: 'CABELO',       requer_comprimento: true,  preco_p: 60,  custo_variavel: 20, porcentagem_profissional: 40 },
  { nome: 'Plástica dos Fios', categoria: 'CABELO',       requer_comprimento: true,  preco_p: 90,  custo_variavel: 30, porcentagem_profissional: 40 },
  { nome: 'Nutrição',          categoria: 'CABELO',       requer_comprimento: true,  preco_p: 50,  custo_variavel: 15, porcentagem_profissional: 40 },
  { nome: 'Corte',             categoria: 'CABELO',       requer_comprimento: false, preco_p: 50,  custo_variavel: 0,  porcentagem_profissional: 40 },
  { nome: 'Relaxamento',       categoria: 'CABELO',       requer_comprimento: false, preco_p: 0,   custo_variavel: 0,  porcentagem_profissional: 40 },
  { nome: 'Unhas',             categoria: 'UNHAS',        requer_comprimento: false, preco_p: 20,  custo_variavel: 5,  porcentagem_profissional: 40 },
  { nome: 'Sobrancelha',       categoria: 'SOBRANCELHAS', requer_comprimento: false, preco_p: 15,  custo_variavel: 2,  porcentagem_profissional: 40 },
  { nome: 'Busso',             categoria: 'SOBRANCELHAS', requer_comprimento: false, preco_p: 25,  custo_variavel: 3,  porcentagem_profissional: 40 },
  { nome: 'Axila',             categoria: 'SOBRANCELHAS', requer_comprimento: false, preco_p: 22,  custo_variavel: 3,  porcentagem_profissional: 40 },
  { nome: 'Extensão de Cílios',categoria: 'CILIOS',       requer_comprimento: false, preco_p: 70,  custo_variavel: 15, porcentagem_profissional: 40 },
  { nome: 'Cílios',            categoria: 'CILIOS',       requer_comprimento: false, preco_p: 20,  custo_variavel: 2,  porcentagem_profissional: 40 },
  { nome: 'Depilação',         categoria: 'OUTRO',        requer_comprimento: false, preco_p: 30,  custo_variavel: 5,  porcentagem_profissional: 40 },
];

// UI: Tabela onde admin seleciona quais oferecer e ajusta os preços individualmente
// Checkbox para selecionar da lista padrão
// Campos editáveis: preco_p, preco_m (se requer_comprimento), preco_g, custo_variavel, porcentagem_profissional
// Nota: M e G são pré-calculados como +20% e +30% mas o admin pode sobrescrever
// Botão "+ Procedimento personalizado" para adicionar fora da lista
```

**Etapa 4 — Despesas Fixas Mensais:**
```jsx
// Lista pré-preenchida com as despesas típicas da planilha
// Admin preenche os valores reais do salão
// Campos: descrição (editável), tipo (dropdown), valor (R$)
// Pode adicionar linhas extras e remover as que não se aplicam
```

**Etapa 5 — Criar Login da Proprietária:**
```jsx
function Etapa5Acesso({ dados, onChange, dadosSalao, profissionais, procedimentos, despesas, onBack }) {
  const [salvando, setSalvando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  const proprietaria = profissionais.find(p => p.cargo === 'PROPRIETARIO');

  const salvarTudo = async () => {
    setSalvando(true);
    try {
      // 1. Criar o salão
      const { data: salao } = await supabase.from('saloes').insert([{
        nome: dadosSalao.nome,
        telefone: dadosSalao.telefone,
        email: dadosSalao.email,
        endereco: dadosSalao.endereco,
        vendedor_id: (await supabase.auth.getUser()).data.user.id
      }]).select().single();

      // 2. Criar configurações padrão
      await supabase.from('configuracoes').insert([{
        salao_id: salao.id,
        nome_salao: dadosSalao.nome,
        custo_fixo_por_atendimento: 29,
        taxa_maquininha_pct: 5,
        porcentagem_profissional: 40
      }]);

      // 3. Criar profissionais
      await supabase.from('profissionais').insert(
        profissionais.map(p => ({ ...p, salao_id: salao.id }))
      );

      // 4. Criar procedimentos
      await supabase.from('procedimentos').insert(
        procedimentos.map(p => ({ ...p, salao_id: salao.id }))
      );

      // 5. Criar despesas fixas (com data do primeiro dia do mês atual)
      const hoje = new Date();
      const inicioMes = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-01`;
      await supabase.from('despesas').insert(
        despesas.filter(d => d.valor > 0).map(d => ({
          ...d, salao_id: salao.id, data: inicioMes, pago: false
        }))
      );

      // 6. Criar usuário da proprietária via Edge Function
      const { error } = await supabase.functions.invoke('criar-usuario-salao', {
        body: {
          email: dados.email,
          senha: dados.senha,
          nome: dados.nome || proprietaria?.nome,
          salao_id: salao.id,
          role: 'PROPRIETARIO'
        }
      });

      if (error) throw error;
      setConcluido(true);

    } catch (err) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  if (concluido) return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
      <div className="text-4xl mb-4">✅</div>
      <h2 className="text-lg font-semibold text-slate-800 mb-2">Salão criado com sucesso!</h2>
      <p className="text-sm text-slate-500 mb-2">
        <strong>{dadosSalao.nome}</strong> está pronto para uso.
      </p>
      <div className="bg-slate-50 rounded-lg p-4 text-left text-sm my-4">
        <p className="text-slate-600 font-medium mb-2">Credenciais da proprietária:</p>
        <p className="text-slate-500">E-mail: <strong>{dados.email}</strong></p>
        <p className="text-slate-500">Senha: <strong>{dados.senha}</strong></p>
        <p className="text-xs text-slate-400 mt-2">Guarde essas informações para entregar à cliente.</p>
      </div>
      <a href="/admin/saloes"
        className="inline-block bg-slate-800 text-white text-sm px-6 py-2.5 rounded-lg">
        Ver meus salões
      </a>
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <h2 className="font-medium text-slate-700">Criar acesso da proprietária</h2>
      <p className="text-xs text-slate-500">
        Defina com a dona do salão o e-mail e senha que ela usará para entrar no sistema.
        Você pode anotar e entregar pessoalmente.
      </p>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
        ⚠ O e-mail e senha são definidos <strong>agora</strong> pelo vendedor junto com a proprietária.
        Não é enviado link de confirmação — o acesso é imediato.
      </div>

      <div>
        <label className="text-xs text-slate-600 block mb-1">Nome da proprietária *</label>
        <input type="text" value={dados.nome || proprietaria?.nome || ''}
          onChange={e => onChange({...dados, nome: e.target.value})}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          placeholder="Nome completo" />
      </div>
      <div>
        <label className="text-xs text-slate-600 block mb-1">E-mail de acesso *</label>
        <input type="email" required value={dados.email}
          onChange={e => onChange({...dados, email: e.target.value})}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          placeholder="email@exemplo.com" />
      </div>
      <div>
        <label className="text-xs text-slate-600 block mb-1">Senha *</label>
        <input type="text" required value={dados.senha}
          onChange={e => onChange({...dados, senha: e.target.value})}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          placeholder="Mínimo 6 caracteres" />
        <p className="text-xs text-slate-400 mt-1">
          Mostrado em texto puro para você anotar e entregar. A proprietária pode trocar depois.
        </p>
      </div>

      <div className="flex justify-between pt-4">
        <button onClick={onBack} className="text-sm text-slate-500 border border-slate-200 rounded-lg px-5 py-2">← Voltar</button>
        <button onClick={salvarTudo}
          disabled={!dados.email || !dados.senha || dados.senha.length < 6 || salvando}
          className="bg-green-700 text-white text-sm px-6 py-2.5 rounded-lg disabled:opacity-40">
          {salvando ? 'Criando salão...' : '✓ Criar salão e acesso'}
        </button>
      </div>
    </div>
  );
}
```

---

## RESUMO DO QUE ENTREGAR

**SQL (rodar no Supabase):**
- [ ] Schema completo acima com todas as tabelas, RLS e trigger

**Edge Functions (criar em `supabase/functions/`):**
- [ ] `criar-usuario-salao/index.ts`
- [ ] `deletar-salao/index.ts`

**Novos arquivos React:**
- [ ] `src/vendedor/VendedorApp.jsx`
- [ ] `src/vendedor/VendedorSidebar.jsx`
- [ ] `src/vendedor/MeusSaloes.jsx`
- [ ] `src/vendedor/NovoSalao.jsx` (com as 5 etapas implementadas)

**Modificar:**
- [ ] `src/App.jsx` — adicionar detecção `role === 'VENDEDOR'`

---

## NOTAS CRÍTICAS PARA A IA

1. **NÃO usar `inviteUserByEmail`** — usar `createUser` com `email_confirm: true`. Isso cria o usuário diretamente sem precisar que ele clique em link de confirmação. O admin define email e senha presencialmente.

2. **Acréscimo M/G na etapa 3:** mostrar os valores calculados (+20% e +30%) ao lado dos campos, mas permitir sobrescrever manualmente. Coloração e Luzes já têm valores próprios na lista padrão.

3. **Deletar salão:** deve apagar em cascata: `auth.users` → `profiles` → `saloes` → (cascade) todo o resto. A Edge Function `deletar-salao` faz isso usando service_role.

4. **Custo fixo padrão R$29:** calculado na planilha como aluguel (R$1.750) ÷ 100 atendimentos/mês = R$17,50 de aluguel + energia/água/internet ≈ R$29 total. O admin pode ajustar nas configurações.

5. **Após criar o salão**, o admin pode entrar em "Gerenciar" para fazer ajustes — essa tela usa os mesmos componentes de `Configuracoes.jsx` do painel da proprietária, apenas com permissão de `salao_id` explícito em vez de buscar do profile.
