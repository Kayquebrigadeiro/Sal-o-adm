import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import CelulaEditavel from '../components/CelulaEditavel';

const PROCEDIMENTOS_PADRAO = [
  { nome: 'Progressiva', categoria: 'CABELO', requer_comprimento: true, preco_p: 130, preco_m: 160, preco_g: 200, custo_variavel: 50, porcentagem_profissional: 40 },
  { nome: 'Botox', categoria: 'CABELO', requer_comprimento: true, preco_p: 100, preco_m: 130, preco_g: 160, custo_variavel: 40, porcentagem_profissional: 40 },
  { nome: 'Coloração', categoria: 'CABELO', requer_comprimento: true, preco_p: 65, preco_m: 80, preco_g: 95, custo_variavel: 28, porcentagem_profissional: 40 },
  { nome: 'Luzes', categoria: 'CABELO', requer_comprimento: true, preco_p: 120, preco_m: 180, preco_g: 230, custo_variavel: 45, porcentagem_profissional: 40 },
  { nome: 'Fusion', categoria: 'CABELO', requer_comprimento: true, preco_p: 50, preco_m: 65, preco_g: 85, custo_variavel: 20, porcentagem_profissional: 40 },
  { nome: 'Hidratação', categoria: 'CABELO', requer_comprimento: true, preco_p: 45, preco_m: 60, preco_g: 80, custo_variavel: 15, porcentagem_profissional: 40 },
  { nome: 'Reconstrução', categoria: 'CABELO', requer_comprimento: true, preco_p: 75, preco_m: 95, preco_g: 120, custo_variavel: 25, porcentagem_profissional: 40 },
  { nome: 'Kit Lavatório', categoria: 'CABELO', requer_comprimento: true, preco_p: 35, preco_m: 45, preco_g: 60, custo_variavel: 10, porcentagem_profissional: 40 },
  { nome: 'Corte', categoria: 'CABELO', requer_comprimento: false, preco_p: 50, custo_variavel: 0, porcentagem_profissional: 40 },
  { nome: 'Unhas', categoria: 'UNHAS', requer_comprimento: false, preco_p: 20, custo_variavel: 5, porcentagem_profissional: 40 },
  { nome: 'Sobrancelha', categoria: 'SOBRANCELHAS', requer_comprimento: false, preco_p: 15, custo_variavel: 2, porcentagem_profissional: 40 },
  { nome: 'Extensão de Cílios', categoria: 'CILIOS', requer_comprimento: false, preco_p: 70, custo_variavel: 15, porcentagem_profissional: 40 },
  { nome: 'Busso', categoria: 'SOBRANCELHAS', requer_comprimento: false, preco_p: 25, custo_variavel: 3, porcentagem_profissional: 40 },
  { nome: 'Depilação', categoria: 'OUTRO', requer_comprimento: false, preco_p: 30, custo_variavel: 5, porcentagem_profissional: 40 },
  { nome: 'Detox', categoria: 'CABELO', requer_comprimento: true, preco_p: 60, preco_m: 80, preco_g: 100, custo_variavel: 20, porcentagem_profissional: 40 },
  { nome: 'Plástica dos Fios', categoria: 'CABELO', requer_comprimento: true, preco_p: 90, preco_m: 120, preco_g: 150, custo_variavel: 30, porcentagem_profissional: 40 },
  { nome: 'Nutrição', categoria: 'CABELO', requer_comprimento: true, preco_p: 50, preco_m: 65, preco_g: 85, custo_variavel: 15, porcentagem_profissional: 40 },
  { nome: 'Axila', categoria: 'OUTRO', requer_comprimento: false, preco_p: 22, custo_variavel: 3, porcentagem_profissional: 40 },
];

export default function GerenciarSalao({ userId }) {
  const { salaoId } = useParams();
  const [aba, setAba] = useState('profissionais');
  const [salao, setSalao] = useState(null);

  useEffect(() => {
    carregarSalao();
  }, [salaoId]);

  const carregarSalao = async () => {
    const { data } = await supabase.from('saloes').select('id, nome').eq('id', salaoId).single();
    setSalao(data);
  };

  if (!salao) return <div className="p-8 text-gray-400">Carregando...</div>;

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{salao.nome}</h1>
        <p className="text-gray-600 text-sm">Configuração do salão</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[['profissionais', 'Profissionais'], ['procedimentos', 'Procedimentos'], ['usuarios', 'Usuários']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
              aba === id ? 'border-gray-800 text-gray-800 font-medium' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {aba === 'profissionais' && <AbaProfissionais salaoId={salaoId} />}
      {aba === 'procedimentos' && <AbaProcedimentos salaoId={salaoId} />}
      {aba === 'usuarios' && <AbaUsuarios salaoId={salaoId} />}
    </div>
  );
}

function AbaProfissionais({ salaoId }) {
  const [lista, setLista] = useState([]);
  const [novaProf, setNovaProf] = useState({ nome: '', cargo: 'FUNCIONARIO', salario_fixo: '' });
  const [adicionando, setAdicionando] = useState(false);

  useEffect(() => {
    carregar();
  }, [salaoId]);

  const carregar = async () => {
    const { data } = await supabase.from('profissionais').select('id, nome, cargo, salario_fixo, ativo').eq('salao_id', salaoId).order('nome');
    setLista(data || []);
  };

  const adicionarProfissional = async (e) => {
    e.preventDefault();
    if (!novaProf.nome.trim()) {
      alert('Nome obrigatório');
      return;
    }

    setAdicionando(true);
    const { error } = await supabase.from('profissionais').insert([{
      salao_id: salaoId,
      nome: novaProf.nome.trim(),
      cargo: novaProf.cargo,
      salario_fixo: Number(novaProf.salario_fixo) || 0,
      ativo: true,
    }]);

    if (!error) {
      setNovaProf({ nome: '', cargo: 'FUNCIONARIO', salario_fixo: '' });
      carregar();
    }
    setAdicionando(false);
  };

  const salvarCampo = async (id, campo, valor) => {
    if (campo === 'salario_fixo') {
      await supabase.from('profissionais').update({ [campo]: Number(valor) || 0 }).eq('id', id);
    } else {
      await supabase.from('profissionais').update({ [campo]: valor }).eq('id', id);
    }
    carregar();
  };

  const toggleAtivo = async (id, ativo) => {
    await supabase.from('profissionais').update({ ativo: !ativo }).eq('id', id);
    carregar();
  };

  const deletarProfissional = async (id) => {
    if (confirm('Deletar esta profissional?')) {
      await supabase.from('profissionais').delete().eq('id', id);
      carregar();
    }
  };

  return (
    <div className="space-y-4">
      {/* Formulário para adicionar nova profissional */}
      <form onSubmit={adicionarProfissional} className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-xs font-bold text-blue-700 mb-3">➕ Adicionar nova profissional</p>
        <div className="grid grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Nome *"
            value={novaProf.nome}
            onChange={e => setNovaProf({ ...novaProf, nome: e.target.value })}
            className="border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <select
            value={novaProf.cargo}
            onChange={e => setNovaProf({ ...novaProf, cargo: e.target.value })}
            className="border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="FUNCIONARIO">Funcionária</option>
            <option value="PROPRIETARIO">Proprietária</option>
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              placeholder="Salário (opcional)"
              value={novaProf.salario_fixo}
              onChange={e => setNovaProf({ ...novaProf, salario_fixo: e.target.value })}
              className="flex-1 border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              type="submit"
              disabled={adicionando}
              className="px-4 py-2 bg-blue-700 text-white text-sm font-bold rounded-lg hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap"
            >
              {adicionando ? '...' : 'Adicionar'}
            </button>
          </div>
        </div>
      </form>

      {/* Tabela de profissionais */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Nome', 'Cargo', 'Salário Fixo', 'Status', 'Ações'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {lista.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-gray-400">
                  Nenhuma profissional cadastrada
                </td>
              </tr>
            ) : (
              lista.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-gray-900">{p.nome}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <select
                      value={p.cargo}
                      onChange={e => salvarCampo(p.id, 'cargo', e.target.value)}
                      className="text-sm border border-gray-200 rounded px-2 py-1 hover:border-gray-400 transition-colors"
                    >
                      <option value="FUNCIONARIO">Funcionária</option>
                      <option value="PROPRIETARIO">Proprietária</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <CelulaEditavel 
                      valor={p.salario_fixo} 
                      onSave={v => salvarCampo(p.id, 'salario_fixo', v)}
                      tipo="number"
                      width="w-20"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs px-3 py-1 rounded-full font-bold ${
                      p.ativo
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}>
                      {p.ativo ? '● Ativa' : '○ Inativa'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button
                      onClick={() => toggleAtivo(p.id, p.ativo)}
                      className="text-xs px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-100 font-medium transition-colors"
                    >
                      {p.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      onClick={() => deletarProfissional(p.id)}
                      className="text-xs px-3 py-1 rounded-lg text-red-600 border border-red-200 hover:bg-red-50 font-medium transition-colors"
                    >
                      Deletar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AbaProcedimentos({ salaoId }) {
  const [lista, setLista] = useState([]);
  const [configuracoes, setConfiguracoes] = useState(null);

  useEffect(() => {
    carregar();
  }, [salaoId]);

  const carregar = async () => {
    const [{ data: procsData }, { data: cfgData }] = await Promise.all([
      supabase.from('procedimentos').select('id, nome, categoria, requer_comprimento, preco_p, preco_m, preco_g, custo_variavel, porcentagem_profissional, ativo').eq('salao_id', salaoId).order('nome'),
      supabase.from('configuracoes').select('custo_fixo_por_atendimento, taxa_maquininha_pct').eq('salao_id', salaoId).single(),
    ]);
    setLista(procsData || []);
    setConfiguracoes(cfgData);
  };

  const salvarCampo = async (id, campo, valor) => {
    await supabase.from('procedimentos').update({ [campo]: Number(valor) || null }).eq('id', id);
    carregar();
  };

  const toggleRequerComprimento = async (id, requer) => {
    await supabase.from('procedimentos').update({ requer_comprimento: !requer }).eq('id', id);
    carregar();
  };

  const toggleAtivo = async (id, ativo) => {
    await supabase.from('procedimentos').update({ ativo: !ativo }).eq('id', id);
    carregar();
  };

  const adicionarPadrao = async (proc) => {
    await supabase.from('procedimentos').insert([{ ...proc, salao_id: salaoId, ativo: true }]);
    carregar();
  };

  const deletarProcedimento = async (id) => {
    if (confirm('Deletar este procedimento?')) {
      await supabase.from('procedimentos').delete().eq('id', id);
      carregar();
    }
  };

  const calcularLucroEstimado = (proc) => {
    if (!configuracoes || !proc.preco_p) return 0;
    const maquininha = proc.preco_p * (configuracoes.taxa_maquininha_pct / 100);
    const profissional = proc.preco_p * (proc.porcentagem_profissional / 100);
    return proc.preco_p - maquininha - profissional - configuracoes.custo_fixo_por_atendimento - proc.custo_variavel;
  };

  return (
    <div className="space-y-4">
      {/* Atalhos - Procedimentos padrão */}
      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
        <p className="text-xs font-bold text-gray-600 mb-3">📋 Adicionar procedimentos padrão:</p>
        <div className="flex flex-wrap gap-2">
          {PROCEDIMENTOS_PADRAO.filter(p => !lista.some(l => l.nome.toLowerCase() === p.nome.toLowerCase())).map(proc => (
            <button
              key={proc.nome}
              onClick={() => adicionarPadrao(proc)}
              className="text-xs bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 font-medium transition-colors"
              title={`${proc.categoria} - R$ ${proc.preco_p}`}
            >
              + {proc.nome}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de procedimentos */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
            <tr>
              {[
                'Procedimento',
                'Cat.',
                'P (Curto)',
                'M (Médio)',
                'G (Longo)',
                'Custo var.',
                '% Prof',
                'Lucro est.',
                'Compr.',
                'Status',
                'Ações'
              ].map(h => (
                <th key={h} className="text-left px-3 py-3 text-xs text-gray-600 font-bold whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {lista.length === 0 ? (
              <tr>
                <td colSpan="11" className="px-4 py-8 text-center text-gray-400 text-sm">
                  Nenhum procedimento cadastrado. Use os atalhos acima ou adicione manualmente.
                </td>
              </tr>
            ) : (
              lista.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3 font-bold text-gray-900">{p.nome}</td>
                  <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{p.categoria}</td>
                  <td className="px-3 py-3">
                    <CelulaEditavel valor={p.preco_p} onSave={v => salvarCampo(p.id, 'preco_p', v)} width="w-16" />
                  </td>
                  <td className="px-3 py-3">
                    <CelulaEditavel 
                      valor={p.requer_comprimento ? p.preco_m : '—'} 
                      onSave={v => salvarCampo(p.id, 'preco_m', v)} 
                      width="w-16"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <CelulaEditavel 
                      valor={p.requer_comprimento ? p.preco_g : '—'} 
                      onSave={v => salvarCampo(p.id, 'preco_g', v)} 
                      width="w-16"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <CelulaEditavel valor={p.custo_variavel} onSave={v => salvarCampo(p.id, 'custo_variavel', v)} width="w-14" />
                  </td>
                  <td className="px-3 py-3">
                    <CelulaEditavel valor={p.porcentagem_profissional} onSave={v => salvarCampo(p.id, 'porcentagem_profissional', v)} width="w-14" />
                  </td>
                  <td className="px-3 py-3 text-xs font-semibold">
                    <span className={calcularLucroEstimado(p) >= 0 ? 'text-green-700' : 'text-red-700'}>
                      R$ {calcularLucroEstimado(p).toFixed(2).replace('.', ',')}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => toggleRequerComprimento(p.id, p.requer_comprimento)}
                      className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                        p.requer_comprimento
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-gray-50 border-gray-200 text-gray-500'
                      }`}
                    >
                      {p.requer_comprimento ? '✓ Sim' : 'Não'}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => toggleAtivo(p.id, p.ativo)}
                      className={`text-xs px-2 py-1 rounded-lg font-bold transition-colors ${
                        p.ativo
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-gray-50 text-gray-500 border border-gray-200'
                      }`}
                    >
                      {p.ativo ? '✓ Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => deletarProcedimento(p.id)}
                      className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                    >
                      Deletar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AbaUsuarios({ salaoId }) {
  const [usuarios, setUsuarios] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ email: '', nome: '', cargo: 'PROPRIETARIO' });
  const [convidando, setConvidando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregar();
  }, [salaoId]);

  const carregar = async () => {
    setCarregando(true);
    const { data } = await supabase
      .from("perfis_acesso")
      .select("*, auth.users(email)")
      .eq("salao_id", salaoId);
    setUsuarios(data || []);
    setCarregando(false);
  };

  const convidar = async (e) => {
    e.preventDefault();
    setConvidando(true);
    setMensagem('');

    try {
      const response = await supabase.functions.invoke('invite-user', {
        body: {
          email: form.email.toLowerCase(),
          salao_id: salaoId,
          role: form.cargo,
          nome: form.nome || form.email.split('@')[0],
        },
      });

      if (response.error) {
        setMensagem(`❌ ${response.error.message || 'Erro ao enviar convite'}`);
      } else if (response.data?.success) {
        setMensagem(`✅ Convite enviado para ${form.email}`);
        setForm({ email: '', nome: '', cargo: 'PROPRIETARIO' });
        setTimeout(() => {
          setModal(false);
          setMensagem('');
          carregar();
        }, 2000);
      }
    } catch (err) {
      console.error('Erro:', err);
      setMensagem(`❌ Erro: ${err.message}`);
    } finally {
      setConvidando(false);
    }
  };

  const revogarAcesso = async (userId) => {
    if (!confirm('Revogar acesso desta usuária?')) return;

    await supabase.from('perfis_acesso').delete().eq('id', userId);
    carregar();
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => setModal(true)}
        className="bg-green-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-800 font-bold"
      >
        + Convidar usuária
      </button>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {carregando ? (
          <div className="p-8 text-center text-gray-400">Carregando usuários...</div>
        ) : usuarios.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            Nenhuma usuária cadastrada. Convide a primeira proprietária acima.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Email', 'Nome', 'Cargo', 'Status', 'Ações'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {usuarios.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.auth?.email || u.id}</td>
                  <td className="px-4 py-3 text-gray-600">—</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      u.cargo === 'PROPRIETARIO'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-gray-50 text-gray-700'
                    }`}>
                      {u.cargo === 'PROPRIETARIO' ? 'Proprietária' : 'Funcionária'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block text-xs px-3 py-1 rounded-full font-bold bg-green-50 text-green-700 border border-green-200">
                      ● Ativa
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => revogarAcesso(u.id)}
                      className="text-xs px-3 py-1 rounded-lg text-red-600 border border-red-200 hover:bg-red-50 font-medium transition-colors"
                    >
                      Revogar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Convite */}
      {modal && (
        <div 
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={e => e.target === e.currentTarget && !convidando && setModal(false)}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Convidar nova usuária</h2>
            
            {mensagem && (
              <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
                mensagem.includes('✅')
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {mensagem}
              </div>
            )}

            <form onSubmit={convidar} className="space-y-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1 font-bold">Email *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="usuarios@exemplo.com"
                  disabled={convidando}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-xs text-gray-600 block mb-1 font-bold">Nome (opcional)</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  placeholder="Teta Silva"
                  disabled={convidando}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-xs text-gray-600 block mb-2 font-bold">Cargo</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="PROPRIETARIO"
                      checked={form.cargo === 'PROPRIETARIO'}
                      onChange={e => setForm({ ...form, cargo: e.target.value })}
                      disabled={convidando}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700 font-medium">Proprietária</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="FUNCIONARIO"
                      checked={form.cargo === 'FUNCIONARIO'}
                      onChange={e => setForm({ ...form, cargo: e.target.value })}
                      disabled={convidando}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700 font-medium">Funcionária</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setModal(false);
                    setMensagem('');
                    setForm({ email: '', nome: '', cargo: 'PROPRIETARIO' });
                  }}
                  disabled={convidando}
                  className="flex-1 py-2.5 text-sm border border-gray-300 rounded-lg font-bold hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={convidando}
                  className="flex-1 py-2.5 text-sm bg-green-700 text-white rounded-lg font-bold hover:bg-green-800 disabled:opacity-50"
                >
                  {convidando ? '⏳ Enviando...' : 'Enviar Convite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
