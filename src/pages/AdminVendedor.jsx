import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Trash2, Plus, Users, Building2 } from 'lucide-react';

export default function AdminVendedor({ email, userId }) {
  const [tab, setTab] = useState('saloes'); // 'saloes' | 'proprietarios'
  const [saloes, setSaloes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  // Form para novo salão
  const [novoSalao, setNovoSalao] = useState({ nome: '', telefone: '' });
  const [salvandoSalao, setSalvandoSalao] = useState(false);

  useEffect(() => {
    carregarSaloes();
  }, []);

  const carregarSaloes = async () => {
    setCarregando(true);
    setErro('');
    try {
      const { data, error } = await supabase
        .from('saloes')
        .select('id, nome, telefone, ativo, criado_em, deletado_em')
        .eq('vendedor_id', userId)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setSaloes(data || []);
    } catch (err) {
      console.error('[AdminVendedor] Erro ao carregar salões:', err);
      setErro('Erro ao carregar salões: ' + err.message);
    } finally {
      setCarregando(false);
    }
  };

  const criarSalao = async (e) => {
    e.preventDefault();
    if (!novoSalao.nome.trim()) {
      alert('Nome do salão é obrigatório');
      return;
    }

    setSalvandoSalao(true);
    try {
      const { data, error } = await supabase
        .from('saloes')
        .insert([
          {
            nome: novoSalao.nome.trim(),
            telefone: novoSalao.telefone.trim() || null,
            vendedor_id: userId,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      console.log('[AdminVendedor] ✅ Salão criado:', data);
      alert('✅ Salão criado com sucesso!');
      setNovoSalao({ nome: '', telefone: '' });
      carregarSaloes();
    } catch (err) {
      console.error('[AdminVendedor] Erro ao criar salão:', err);
      alert('❌ Erro: ' + err.message);
    } finally {
      setSalvandoSalao(false);
    }
  };

  const deletarSalao = async (salaoId, salaoNome) => {
    if (!confirm(`⚠️ Deletar "${salaoNome}" permanentemente?`)) return;

    try {
      const { data, error } = await supabase
        .rpc('fn_deletar_salao', { p_salao_id: salaoId });

      if (error) throw error;

      console.log('[AdminVendedor] Resultado:', data);
      alert('✅ Salão deletado.');
      carregarSaloes();
    } catch (err) {
      console.error('[AdminVendedor] Erro ao deletar:', err);
      alert('❌ Erro: ' + err.message);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Painel de Vendedor</h1>
        <p className="text-gray-600">Gerencie salões e proprietárias: {email}</p>
      </div>

      {/* Abas */}
      <div className="flex gap-4 mb-8 border-b border-gray-200">
        <button
          onClick={() => setTab('saloes')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            tab === 'saloes'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Building2 className="inline w-5 h-5 mr-2" />
          Salões ({saloes.filter((s) => !s.deletado_em).length})
        </button>
        <button
          onClick={() => setTab('proprietarios')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            tab === 'proprietarios'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="inline w-5 h-5 mr-2" />
          Proprietárias
        </button>
      </div>

      {erro && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {erro}
        </div>
      )}

      {/* TAB: SALÕES */}
      {tab === 'saloes' && (
        <div>
          {/* Formulário */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Criar Novo Salão</h2>
            <form onSubmit={criarSalao} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Nome do salão *"
                  value={novoSalao.nome}
                  onChange={(e) => setNovoSalao({ ...novoSalao, nome: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-800"
                />
                <input
                  type="tel"
                  placeholder="Telefone"
                  value={novoSalao.telefone}
                  onChange={(e) => setNovoSalao({ ...novoSalao, telefone: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-800"
                />
              </div>
              <button
                type="submit"
                disabled={salvandoSalao || carregando}
                className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 disabled:opacity-50 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {salvandoSalao ? 'Criando...' : 'Criar Salão'}
              </button>
            </form>
          </div>

          {/* Lista de Salões */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Nome</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Telefone</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Criado em</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Ações</th>
                </tr>
              </thead>
              <tbody>
                {carregando ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      Carregando...
                    </td>
                  </tr>
                ) : saloes.filter((s) => !s.deletado_em).length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      Nenhum salão criado ainda
                    </td>
                  </tr>
                ) : (
                  saloes
                    .filter((s) => !s.deletado_em)
                    .map((salao) => (
                      <tr key={salao.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{salao.nome}</td>
                        <td className="px-6 py-4 text-gray-600">{salao.telefone || '-'}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              salao.ativo
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {salao.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(salao.criado_em).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => deletarSalao(salao.id, salao.nome)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors"
                            title="Deletar salão"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: PROPRIETÁRIAS */}
      {tab === 'proprietarios' && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Gerenciar Proprietárias</h3>
          <p className="text-gray-600 mb-6">
            Crie logins para as proprietárias dos salões. Escolha um salão abaixo:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {saloes.filter((s) => !s.deletado_em).map((salao) => (
              <CadastroPropietaria
                key={salao.id}
                salao={salao}
                vendedorId={userId}
                onSuccess={carregarSaloes}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE: Cadastro de Proprietária para um Salão
// ═══════════════════════════════════════════════════════════════════════════

function CadastroPropietaria({ salao, vendedorId, onSuccess }) {
  const [mostrando, setMostrando] = useState(false);
  const [email, setEmail] = useState('');
  const [nomeProprietaria, setNomeProprietaria] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [logins, setLogins] = useState([]);
  const [carregandoLogins, setCarregandoLogins] = useState(false);

  useEffect(() => {
    if (mostrando) carregarLogins();
  }, [mostrando]);

  const carregarLogins = async () => {
    setCarregandoLogins(true);
    try {
      const { data, error } = await supabase
        .from('logins_gerados')
        .select('*')
        .eq('salao_id', salao.id)
        .order('gerado_em', { ascending: false });

      if (error) throw error;
      setLogins(data || []);
    } catch (err) {
      console.error('[CadastroPropietaria] Erro:', err);
    } finally {
      setCarregandoLogins(false);
    }
  };

  const criarLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !nomeProprietaria.trim()) {
      alert('Email e nome são obrigatórios');
      return;
    }

    setSalvando(true);
    try {
      // 1. Criar usuário no Auth
      const senhaTemporaria = Math.random().toString(36).slice(-12) + 'A1!';
      
      // Aqui você precisará de uma função RPC no Supabase para criar usuário
      // Por enquanto, vamos registrar apenas o login_gerado
      const { data: loginData, error: loginError } = await supabase
        .from('logins_gerados')
        .insert([
          {
            vendedor_id: vendedorId,
            salao_id: salao.id,
            email_proprietaria: email.trim(),
            senha_temporaria: senhaTemporaria,
            ativo: true,
          },
        ])
        .select()
        .single();

      if (loginError) throw loginError;

      console.log('[CadastroPropietaria] ✅ Login gerado:', loginData);
      alert(`✅ Login criado!\n\nEmail: ${email}\nSenha temporária: ${senhaTemporaria}\n\n⚠️ Guarde essas credenciais!`);

      setEmail('');
      setNomeProprietaria('');
      carregarLogins();
    } catch (err) {
      console.error('[CadastroPropietaria] Erro:', err);
      alert('❌ Erro: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <button
        onClick={() => setMostrando(!mostrando)}
        className="w-full text-left font-semibold text-gray-900 hover:text-gray-700"
      >
        {salao.nome}
      </button>

      {mostrando && (
        <div className="mt-4 space-y-4">
          {/* Formulário */}
          <form onSubmit={criarLogin} className="space-y-3 border-t pt-4">
            <input
              type="text"
              placeholder="Nome da proprietária"
              value={nomeProprietaria}
              onChange={(e) => setNomeProprietaria(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
            <button
              type="submit"
              disabled={salvando}
              className="w-full bg-gray-800 text-white py-1 rounded text-sm hover:bg-gray-900 disabled:opacity-50"
            >
              {salvando ? 'Criando...' : 'Gerar Login'}
            </button>
          </form>

          {/* Lista de logins criados */}
          {carregandoLogins ? (
            <p className="text-sm text-gray-500 text-center">Carregando...</p>
          ) : logins.length === 0 ? (
            <p className="text-sm text-gray-500 text-center">Nenhum login criado</p>
          ) : (
            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-gray-700 mb-2">Logins criados:</p>
              <ul className="space-y-2">
                {logins.map((login) => (
                  <li
                    key={login.id}
                    className="text-xs bg-gray-50 border border-gray-200 rounded p-2"
                  >
                    <p className="font-mono text-gray-900">{login.email_proprietaria}</p>
                    <p className="text-gray-500">
                      {new Date(login.gerado_em).toLocaleDateString('pt-BR')}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
