import { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

// Gera senha segura aleatória (10 chars: letras + números)
function gerarSenhaSegura() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

export default function NovoSalao({ userId }) {
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

  // ── Etapa 3: criar salão no backend Node ─────────────────────────────────
  const finalizarCadastro = async () => {
    setCarregando(true);
    try {
      await api.post('/salao/criar-proprietaria', {
        email:       form.email_proprietaria,
        senha:       senhaGerada,
        nome:        form.nome_proprietaria,
        nome_salao:  form.nome_salao,
        telefone:    form.telefone,
        vendedor_id: userId,
      });
      setEtapa(4);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Erro desconhecido';
      alert('Erro ao criar salão: ' + msg);
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
              etapa >= n ? 'bg-emerald-500' : 'bg-sky-100'
            }`}
          />
        ))}
      </div>

      {/* ── ETAPA 1: Dados do Salão ── */}
      {etapa === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800">Dados do Salão</h2>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Nome do Salão *
            </label>
            <input
              type="text"
              value={form.nome_salao}
              onChange={e => set('nome_salao', e.target.value.toUpperCase())}
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500"
              placeholder="Ex: Studio Bella"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
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
          <h2 className="text-xl font-bold text-gray-800">Acesso da Proprietária</h2>
          <p className="text-sm text-gray-500">
            Use o e-mail real da proprietária. Ela receberá um link de ativação.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Nome da Proprietária *
            </label>
            <input
              type="text"
              value={form.nome_proprietaria}
              onChange={e => set('nome_proprietaria', e.target.value.toUpperCase())}
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500"
              placeholder="Ex: Maria Silva"
            />
          </div>

          {/* ← CAMPO NOVO: e-mail real obrigatório */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
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
            <p className="text-xs text-gray-500 mt-1">
              Este será o login permanente dela no sistema.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setEtapa(1)}
              className="flex-1 py-3 border border-gray-200 text-gray-500 font-medium rounded-xl hover:bg-gray-50"
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
          <h2 className="text-xl font-bold text-gray-800">Confirmar e Criar</h2>

          {/* Resumo */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-1 text-sm">
            <p><span className="text-gray-500">Salão:</span> <strong>{form.nome_salao}</strong></p>
            <p><span className="text-gray-500">Proprietária:</span> <strong>{form.nome_proprietaria}</strong></p>
          </div>

          {/* Credenciais geradas */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-emerald-800 uppercase tracking-wide">
              Credenciais de Acesso
            </p>
            <div>
              <p className="text-xs text-emerald-600 mb-0.5">Login (E-mail)</p>
              <p className="font-mono font-bold text-gray-800 break-all">
                {form.email_proprietaria}
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-600 mb-0.5">Senha Temporária</p>
              <p className="font-mono font-bold text-gray-800 text-lg tracking-widest">
                {senhaGerada}
              </p>
            </div>
          </div>

          {/* Aviso */}
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex gap-3">
            <span className="text-gray-500 text-lg mt-0.5">⚠️</span>
            <p className="text-sm text-blue-800">
              <strong>Atenção:</strong> A conta já está ativa e pronta para uso.{' '}
              <strong>Anote a senha acima e entregue para a proprietária pessoalmente.</strong>
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setEtapa(2)}
              className="flex-1 py-3 border border-gray-200 text-gray-500 font-medium rounded-xl hover:bg-gray-50"
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
          <h2 className="text-xl font-bold text-gray-800">Salão criado com sucesso!</h2>
          <p className="text-sm text-gray-500">
            A conta de <strong>{form.email_proprietaria}</strong> já está ativa.
          </p>
          
          {/* Credenciais novamente exibidas na Etapa 4 */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3 mt-6">
            <p className="text-sm font-semibold text-emerald-800 uppercase tracking-wide">
              Credenciais de Acesso
            </p>
            <div>
              <p className="text-xs text-emerald-600 mb-0.5">Login (E-mail)</p>
              <p className="font-mono font-bold text-gray-800 break-all">
                {form.email_proprietaria}
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-600 mb-0.5">Senha Temporária</p>
              <p className="font-mono font-bold text-gray-800 text-lg tracking-widest">
                {senhaGerada}
              </p>
            </div>
          </div>

          {/* Aviso visual em destaque */}
          <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex gap-3 mt-6">
            <span className="text-red-600 text-lg font-bold mt-0.5">⚠️</span>
            <div className="text-left">
              <p className="text-sm text-red-800 font-semibold">
                Anote esta senha AGORA!
              </p>
              <p className="text-xs text-red-700 mt-1">
                Ela <strong>não será mostrada novamente</strong> nesta tela. Se precisar consultá-la depois, acesse a listagem de salões e clique no botão "Ver Logins Gerados".
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Lembre-se de entregar a senha temporária para a proprietária pessoalmente.
          </p>
          <button
            onClick={() => navigate('/admin/saloes')}
            className="mt-4 px-6 py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600"
          >
            Voltar para Salões
          </button>
        </div>
      )}
    </div>
  );
}
