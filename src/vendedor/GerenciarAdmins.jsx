import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

export default function GerenciarAdmins() {
  const { showToast } = useToast();
  const [admins, setAdmins]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState({ nome: '', email: '', senha: '' });
  const [salvando, setSalvando] = useState(false);
  const [meuId, setMeuId]       = useState(null);
  const [confirmacao, setConfirmacao] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMeuId(data.user?.id));
    carregar();
  }, []);

  const carregar = async () => {
    setLoading(true);
    
    // Usar função RPC que tem acesso ao auth.users
    const { data, error } = await supabase.rpc('get_admin_emails');
    
    if (error) {
      console.error('Erro ao carregar admins:', error);
      setAdmins([]);
    } else {
      setAdmins(data || []);
    }
    
    setLoading(false);
  };

  const criarAdmin = async (e) => {
    e.preventDefault();
    if (form.senha.length < 6) { showToast('SENHA DEVE TER PELO MENOS 6 CARACTERES', 'error'); return; }
    setSalvando(true);

    const { error } = await supabase.functions.invoke('criar-admin', {
      body: { email: form.email, senha: form.senha, nome: form.nome, vendedor_id: meuId }
    });

    setSalvando(false);
    if (error) { showToast('ERRO: ' + error.message, 'error'); return; }

    setModal(false);
    setForm({ nome: '', email: '', senha: '' });
    carregar();
  };

  const removerAdmin = async (id, nome) => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.functions.invoke('remover-admin', {
      body: { user_id: id, admin_solicitante_id: user.id }
    });

    if (error) { showToast('ERRO: ' + error.message, 'error'); setLoading(false); return; }
    showToast('ADMIN REMOVIDO', 'success');
    carregar();
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Admins do sistema</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Todos os admins têm acesso igual ao painel — podem criar e gerenciar salões.
          </p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="bg-sky-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-sky-600"
        >
          + Novo admin
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-gray-400">Carregando...</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Desde</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {admins.map(a => (
                <tr key={a.auth_user_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-800">{a.email || '—'}</span>
                    {a.auth_user_id === meuId && (
                      <span className="ml-2 text-[10px] bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded-full">
                        você
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(a.criado_em).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {a.auth_user_id !== meuId && (
                      <button
                        onClick={() => setConfirmacao({
                          title: 'REMOVER ADMIN',
                          message: `REMOVER O ADMIN "${a.email}"?\n\nELE PERDERÁ O ACESSO AO SISTEMA IMEDIATAMENTE.`,
                          confirmLabel: 'REMOVER',
                          tone: 'danger',
                          onConfirm: async () => {
                            setConfirmacao(null);
                            await removerAdmin(a.auth_user_id, a.email);
                          },
                        })}
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
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={e => e.target === e.currentTarget && setModal(false)}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Novo admin</h2>
            <p className="text-xs text-gray-500 mb-5">
              Defina email e senha presencialmente. O acesso é imediato.
            </p>

            <form onSubmit={criarAdmin} className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Nome</label>
                <input
                  type="text" required value={form.nome}
                  onChange={e => setForm({...form, nome: e.target.value.toUpperCase()})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                  placeholder="Nome do novo admin"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">E-mail de acesso</label>
                <input
                  type="email" required value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Senha</label>
                <input
                  type="text" required value={form.senha}
                  onChange={e => setForm({...form, senha: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                  placeholder="Mínimo 6 caracteres"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Mostrado em texto para você anotar e entregar.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={() => setModal(false)}
                  className="flex-1 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={salvando}
                  className="flex-1 py-2.5 text-sm bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-50"
                >
                  {salvando ? 'Criando...' : 'Criar admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmacao}
        title={confirmacao?.title || ''}
        message={confirmacao?.message || ''}
        confirmLabel={confirmacao?.confirmLabel || 'CONFIRMAR'}
        tone={confirmacao?.tone || 'danger'}
        onCancel={() => setConfirmacao(null)}
        onConfirm={confirmacao?.onConfirm || (() => setConfirmacao(null))}
      />
    </div>
  );
}
