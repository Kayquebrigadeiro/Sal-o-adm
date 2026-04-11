import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

// Gera senha segura aleatória (10 chars: letras + números)
function gerarSenhaSegura() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

export default function NovoSalao() {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState(1);
  const [carregando, setCarregando] = useState(false);
  const [senhaGerada] = useState(gerarSenhaSegura); // gerada 1x ao montar
  
  const [form, setForm] = useState({
    // Etapa 1
    nome_salao: '',
    telefone: '',
    // Etapa 2 — NOVO FLUXO
    nome_proprietaria: '',
    email_proprietaria: '',   // ← e-mail REAL, digitado pelo vendedor
  });

  const set = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }));

  // ── Etapa 3: chamada à Edge Function ────────────────────────────────────
  const finalizarCadastro = async () => {
    setCarregando(true);
    try {

      // 1. Garante sessão ativa
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        alert('Sua sessão expirou. Faça login novamente.');
        window.location.href = '/login';
        return;
      }

      const session = sessionData.session;

      // 2. Invoca a Edge Function com o header que elimina o 401
      const { data, error } = await supabase.functions.invoke('criar-proprietaria', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          email:        form.email_proprietaria,
          senha:        senhaGerada,
          nome:         form.nome_proprietaria,
          nome_salao:   form.nome_salao,
          telefone:     form.telefone,
          vendedor_id:  session.user.id,
          redirectTo:   window.location.origin + '/agenda',
        },
      });

      if (error) throw new Error(error.message);
      setEtapa(4);

    } catch (err) {
      alert('Erro ao criar salão: ' + err.message);
    } finally {
      setCarregando(false);
    }
  };

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto p-6">
      {/* Indicador de etapas */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map(n => (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              etapa >= n ? 'bg-emerald-500' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      {/* ── ETAPA 1: Dados do Salão ── */}
      {etapa === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800">Dados do Salão</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nome do Salão *
            </label>
            <input
              type="text"
              value={form.nome_salao}
              onChange={e => set('nome_salao', e.target.value)}
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500"
              placeholder="Ex: Studio Bella"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Telefone / WhatsApp *
            </label>
            <input
              type="tel"
              value={form.telefone}
              onChange={e => set('telefone', e.target.value)}
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500"
              placeholder="(11) 99999-9999"
            />
          </div>

          <button
            onClick={() => {
              if (!form.nome_salao || !form.telefone)
                return alert('Preencha todos os campos.');
              setEtapa(2);
            }}
            className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600"
          >
            Próximo →
          </button>
        </div>
      )}

      {/* ── ETAPA 2: Dados da Proprietária (NOVO FLUXO) ── */}
      {etapa === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800">Acesso da Proprietária</h2>
          <p className="text-sm text-slate-500">
            Use o e-mail real da proprietária. Ela receberá um link de ativação.
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nome da Proprietária *
            </label>
            <input
              type="text"
              value={form.nome_proprietaria}
              onChange={e => set('nome_proprietaria', e.target.value)}
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500"
              placeholder="Ex: Maria Silva"
            />
          </div>

          {/* ← CAMPO NOVO: e-mail real obrigatório */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              E-mail da Proprietária *
            </label>
            <input
              type="email"
              value={form.email_proprietaria}
              onChange={e => set('email_proprietaria', e.target.value)}
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500"
              placeholder="maria@exemplo.com"
              autoComplete="off"
            />
            <p className="text-xs text-slate-400 mt-1">
              Este será o login permanente dela no sistema.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setEtapa(1)}
              className="flex-1 py-3 border border-slate-300 text-slate-600 font-medium rounded-xl hover:bg-slate-50"
            >
              ← Voltar
            </button>
            <button
              onClick={() => {
                if (!form.nome_proprietaria || !form.email_proprietaria)
                  return alert('Preencha todos os campos.');
                const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email_proprietaria);
                if (!emailValido) return alert('Digite um e-mail válido.');
                setEtapa(3);
              }}
              className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600"
            >
              Próximo →
            </button>
          </div>
        </div>
      )}

      {/* ── ETAPA 3: Confirmação + credenciais geradas ── */}
      {etapa === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800">Confirmar e Criar</h2>

          {/* Resumo */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1 text-sm">
            <p><span className="text-slate-500">Salão:</span> <strong>{form.nome_salao}</strong></p>
            <p><span className="text-slate-500">Proprietária:</span> <strong>{form.nome_proprietaria}</strong></p>
          </div>

          {/* Credenciais geradas */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-emerald-800 uppercase tracking-wide">
              Credenciais de Acesso
            </p>
            <div>
              <p className="text-xs text-emerald-600 mb-0.5">Login (E-mail)</p>
              <p className="font-mono font-bold text-slate-800 break-all">
                {form.email_proprietaria}
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-600 mb-0.5">Senha Temporária</p>
              <p className="font-mono font-bold text-slate-800 text-lg tracking-widest">
                {senhaGerada}
              </p>
            </div>
          </div>

          {/* Aviso sobre e-mail de ativação */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
            <span className="text-amber-500 text-lg mt-0.5">⚠️</span>
            <p className="text-sm text-amber-800">
              <strong>Atenção:</strong> A proprietária receberá um e-mail de ativação do Supabase.{' '}
              <strong>Ela deve clicar no link antes do primeiro login.</strong>{' '}
              Anote a senha acima e entregue pessoalmente.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setEtapa(2)}
              className="flex-1 py-3 border border-slate-300 text-slate-600 font-medium rounded-xl hover:bg-slate-50"
              disabled={carregando}
            >
              ← Voltar
            </button>
            <button
              onClick={finalizarCadastro}
              disabled={carregando}
              className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 disabled:opacity-60"
            >
              {carregando ? 'Criando...' : 'Finalizar ✓'}
            </button>
          </div>
        </div>
      )}

      {/* ── ETAPA 4: Sucesso ── */}
      {etapa === 4 && (
        <div className="text-center space-y-4 py-8">
          <div className="text-5xl">🎉</div>
          <h2 className="text-xl font-bold text-slate-800">Salão criado com sucesso!</h2>
          <p className="text-sm text-slate-500">
            Um e-mail de ativação foi enviado para{' '}
            <strong>{form.email_proprietaria}</strong>.
          </p>
          <p className="text-xs text-slate-400">
            Entregue a senha temporária para a proprietária pessoalmente.
          </p>
          <button
            onClick={() => navigate('/admin/saloes')}
            className="mt-4 px-6 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900"
          >
            Voltar para Salões
          </button>
        </div>
      )}
    </div>
  );
}
