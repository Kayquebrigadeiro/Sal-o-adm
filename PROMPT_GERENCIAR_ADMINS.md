# PROMPT — Gerenciar Admins no Painel do Vendedor
## Adicionar ao que já foi implementado no VendedorApp

---

## CONTEXTO

O painel do admin (VendedorApp) já está implementado com wizard de criação de salões.
Precisa adicionar uma nova seção: **Gerenciar Admins**, onde um admin pode criar e remover outros admins sem precisar acessar o Supabase.

---

## O QUE ADICIONAR

### 1. Nova rota no VendedorApp.jsx

```jsx
// Adicionar ao VendedorApp.jsx:
import GerenciarAdmins from './GerenciarAdmins';

// Na rota:
<Route path="/admin/admins" element={<GerenciarAdmins />} />
```

### 2. Novo item no VendedorSidebar.jsx

```jsx
// Adicionar ao menu do sidebar, após "Meus Salões":
<NavLink to="/admin/admins" className={...}>
  Admins
</NavLink>
```

### 3. Nova Edge Function — `criar-admin/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { email, senha, nome } = await req.json()

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Cria o usuário com acesso imediato (sem link de confirmação)
  const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, role: 'VENDEDOR' }
  })

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })

  // Cria o perfil com role VENDEDOR (sem salao_id — admin não pertence a um salão)
  await supabaseAdmin.from('profiles').insert({
    id: user.user.id,
    salao_id: null,
    role: 'VENDEDOR',
    nome
  })

  return new Response(JSON.stringify({ user_id: user.user.id }), { status: 200 })
})
```

### 4. Nova Edge Function — `remover-admin/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { user_id, admin_solicitante_id } = await req.json()

  // Impedir que o admin se auto-delete
  if (user_id === admin_solicitante_id) {
    return new Response(JSON.stringify({ error: 'Você não pode remover a si mesmo.' }), { status: 400 })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  await supabaseAdmin.from('profiles').delete().eq('id', user_id)
  await supabaseAdmin.auth.admin.deleteUser(user_id)

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})
```

### 5. Novo arquivo — `src/vendedor/GerenciarAdmins.jsx`

```jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function GerenciarAdmins() {
  const [admins, setAdmins]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState({ nome: '', email: '', senha: '' });
  const [salvando, setSalvando] = useState(false);
  const [meuId, setMeuId]       = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMeuId(data.user?.id));
    carregar();
  }, []);

  const carregar = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, nome, criado_em')
      .eq('role', 'VENDEDOR')
      .order('criado_em');
    setAdmins(data || []);
    setLoading(false);
  };

  const criarAdmin = async (e) => {
    e.preventDefault();
    if (form.senha.length < 6) { alert('Senha deve ter pelo menos 6 caracteres.'); return; }
    setSalvando(true);

    const { error } = await supabase.functions.invoke('criar-admin', {
      body: { email: form.email, senha: form.senha, nome: form.nome }
    });

    setSalvando(false);
    if (error) { alert('Erro: ' + error.message); return; }

    setModal(false);
    setForm({ nome: '', email: '', senha: '' });
    carregar();
  };

  const removerAdmin = async (id, nome) => {
    if (!confirm(`Remover o admin "${nome}"?\n\nEle perderá o acesso ao sistema imediatamente.`)) return;

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.functions.invoke('remover-admin', {
      body: { user_id: id, admin_solicitante_id: user.id }
    });

    if (error) { alert('Erro: ' + error.message); return; }
    carregar();
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Admins do sistema</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Todos os admins têm acesso igual ao painel — podem criar e gerenciar salões.
          </p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-900"
        >
          + Novo admin
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-slate-400">Carregando...</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Nome</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Desde</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {admins.map(a => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{a.nome || '—'}</span>
                    {a.id === meuId && (
                      <span className="ml-2 text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">
                        você
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(a.criado_em).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {a.id !== meuId && (
                      <button
                        onClick={() => removerAdmin(a.id, a.nome)}
                        className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-1 hover:bg-red-50"
                      >
                        Remover
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal novo admin */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={e => e.target === e.currentTarget && setModal(false)}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Novo admin</h2>
            <p className="text-xs text-slate-400 mb-5">
              Defina email e senha presencialmente. O acesso é imediato.
            </p>

            <form onSubmit={criarAdmin} className="space-y-3">
              <div>
                <label className="text-xs text-slate-600 block mb-1">Nome</label>
                <input
                  type="text" required value={form.nome}
                  onChange={e => setForm({...form, nome: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Nome do novo admin"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600 block mb-1">E-mail de acesso</label>
                <input
                  type="email" required value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600 block mb-1">Senha</label>
                <input
                  type="text" required value={form.senha}
                  onChange={e => setForm({...form, senha: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Mínimo 6 caracteres"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Mostrado em texto para você anotar e entregar.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={() => setModal(false)}
                  className="flex-1 py-2.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={salvando}
                  className="flex-1 py-2.5 text-sm bg-slate-800 text-white rounded-lg disabled:opacity-50"
                >
                  {salvando ? 'Criando...' : 'Criar admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## RESUMO DO QUE ENTREGAR

- [ ] `supabase/functions/criar-admin/index.ts` — Edge Function nova
- [ ] `supabase/functions/remover-admin/index.ts` — Edge Function nova
- [ ] `src/vendedor/GerenciarAdmins.jsx` — componente novo
- [ ] `src/vendedor/VendedorApp.jsx` — adicionar rota `/admin/admins`
- [ ] `src/vendedor/VendedorSidebar.jsx` — adicionar item "Admins" no menu

---

## REGRAS IMPORTANTES

- Admin **não pode se remover** — botão "Remover" fica oculto para o próprio usuário logado (identificado pelo badge "você")
- Todos os admins têm **permissão igual** — não há hierarquia entre admins
- Senha mostrada em **texto puro** no modal — mesma lógica do cadastro da proprietária, definida presencialmente
- `salao_id: null` no profile do admin — admins não pertencem a nenhum salão específico
