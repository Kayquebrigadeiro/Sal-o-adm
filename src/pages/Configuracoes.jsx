import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import PageHeader from '../components/PageHeader';
import { Trash2, Plus } from 'lucide-react';

const CATEGORIAS = ['CABELO', 'UNHAS', 'SOBRANCELHAS', 'CILIOS', 'OUTRO'];

export default function Configuracoes({ salaoId }) {
  const { showToast } = useToast();
  const [abaAtiva, setAbaAtiva] = useState('procedimentos');
  const [loading, setLoading] = useState(true);

  // Estados
  const [procedimentos, setProcedimentos] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [config, setConfig] = useState({ custo_fixo_por_atendimento: 29, taxa_maquininha_pct: 5, prolabore_mensal: 0 });

  useEffect(() => {
    carregarDados();
  }, [salaoId]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [procRes, profRes, configRes] = await Promise.all([
        supabase.from('procedimentos').select('*').eq('salao_id', salaoId).order('categoria'),
        supabase.from('profissionais').select('*').eq('salao_id', salaoId).order('nome'),
        supabase.from('configuracoes').select('*').eq('salao_id', salaoId).single()
      ]);

      if (procRes.data) setProcedimentos(procRes.data);
      if (profRes.data) setProfissionais(profRes.data);
      if (configRes.data) setConfig(configRes.data);
    } catch (error) {
      showToast('Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════ PROCEDIMENTOS ═══════════════════════════════
  const salvarProcedimento = async (proc) => {
    try {
      if (proc.id) {
        await supabase.from('procedimentos').update({
          nome: proc.nome,
          categoria: proc.categoria,
          requer_comprimento: proc.requer_comprimento,
          preco_p: proc.preco_p,
          preco_m: proc.preco_m,
          preco_g: proc.preco_g,
          porcentagem_profissional: proc.porcentagem_profissional,
          custo_variavel: proc.custo_variavel,
          ativo: proc.ativo
        }).eq('id', proc.id);
      } else {
        await supabase.from('procedimentos').insert({ ...proc, salao_id: salaoId });
      }
      showToast('Salvo', 'success');
      carregarDados();
    } catch (error) {
      showToast('Erro ao salvar', 'error');
    }
  };

  const toggleAtivoProcedimento = async (id, ativo) => {
    await supabase.from('procedimentos').update({ ativo: !ativo }).eq('id', id);
    carregarDados();
  };

  const adicionarProcedimento = () => {
    setProcedimentos([...procedimentos, {
      id: null,
      nome: '',
      categoria: 'OUTRO',
      requer_comprimento: false,
      preco_p: 0,
      preco_m: 0,
      preco_g: 0,
      porcentagem_profissional: 40,
      custo_variavel: 0,
      ativo: true,
      temp: true
    }]);
  };

  // ═══════════════════════════════ PROFISSIONAIS ═══════════════════════════════
  const salvarProfissional = async (prof) => {
    try {
      if (prof.id) {
        await supabase.from('profissionais').update({
          nome: prof.nome,
          cargo: prof.cargo,
          salario_fixo: prof.salario_fixo,
          ativo: prof.ativo
        }).eq('id', prof.id);
      } else {
        await supabase.from('profissionais').insert({ ...prof, salao_id: salaoId });
      }
      showToast('Salvo', 'success');
      carregarDados();
    } catch (error) {
      showToast('Erro ao salvar', 'error');
    }
  };

  const toggleAtivoProfissional = async (id, ativo) => {
    await supabase.from('profissionais').update({ ativo: !ativo }).eq('id', id);
    carregarDados();
  };

  const adicionarProfissional = () => {
    setProfissionais([...profissionais, {
      id: null,
      nome: '',
      cargo: 'FUNCIONARIO',
      salario_fixo: 0,
      ativo: true,
      temp: true
    }]);
  };

  // ═══════════════════════════════ CONFIGURAÇÕES ═══════════════════════════════
  const salvarConfiguracoes = async () => {
    try {
      await supabase.from('configuracoes').update({
        custo_fixo_por_atendimento: Number(config.custo_fixo_por_atendimento),
        taxa_maquininha_pct: Number(config.taxa_maquininha_pct),
        prolabore_mensal: Number(config.prolabore_mensal)
      }).eq('salao_id', salaoId);
      showToast('Configurações salvas', 'success');
    } catch (error) {
      showToast('Erro ao salvar', 'error');
    }
  };

  if (loading) return <div className="p-10 text-center">Carregando...</div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <PageHeader title="Configurações" subtitle="Gerencie procedimentos, equipe e valores" />

      {/* Abas */}
      <div className="flex gap-6 border-b border-slate-200 mb-6">
        {[
          { key: 'procedimentos', label: 'Procedimentos' },
          { key: 'equipe', label: 'Equipe' },
          { key: 'financeiro', label: 'Financeiro' }
        ].map(aba => (
          <button
            key={aba.key}
            onClick={() => setAbaAtiva(aba.key)}
            className={`pb-3 text-sm font-medium transition-colors ${
              abaAtiva === aba.key
                ? 'border-b-2 border-emerald-500 text-emerald-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {aba.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════ ABA PROCEDIMENTOS ═══════════════════════════════ */}
      {abaAtiva === 'procedimentos' && (
        <div className="space-y-6">
          {CATEGORIAS.map(cat => {
            const procsCategoria = procedimentos.filter(p => p.categoria === cat);
            return (
              <div key={cat} className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">{cat}</h3>
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs text-slate-400 mb-2">
                    <span className="col-span-3">Nome</span>
                    <span className="col-span-1 text-center">P R$</span>
                    <span className="col-span-1 text-center">M R$</span>
                    <span className="col-span-1 text-center">G R$</span>
                    <span className="col-span-1 text-center">Com%</span>
                    <span className="col-span-1 text-center">Custo</span>
                    <span className="col-span-1 text-center">Ativo</span>
                    <span className="col-span-1" />
                  </div>
                  {procsCategoria.map((proc, idx) => (
                    <div key={proc.id || idx} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        value={proc.nome}
                        onChange={e => {
                          const novos = [...procedimentos];
                          const index = novos.findIndex(p => p === proc);
                          novos[index].nome = e.target.value;
                          setProcedimentos(novos);
                        }}
                        onBlur={() => proc.nome && salvarProcedimento(proc)}
                        placeholder="Nome"
                        className="col-span-3 border border-slate-300 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <input
                        type="number"
                        value={proc.preco_p}
                        onChange={e => {
                          const novos = [...procedimentos];
                          const index = novos.findIndex(p => p === proc);
                          novos[index].preco_p = e.target.value;
                          setProcedimentos(novos);
                        }}
                        onBlur={() => proc.nome && salvarProcedimento(proc)}
                        className="col-span-1 border border-slate-300 rounded-lg px-1 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <input
                        type="number"
                        value={proc.preco_m}
                        onChange={e => {
                          const novos = [...procedimentos];
                          const index = novos.findIndex(p => p === proc);
                          novos[index].preco_m = e.target.value;
                          setProcedimentos(novos);
                        }}
                        onBlur={() => proc.nome && salvarProcedimento(proc)}
                        disabled={!proc.requer_comprimento}
                        className="col-span-1 border border-slate-300 rounded-lg px-1 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
                      />
                      <input
                        type="number"
                        value={proc.preco_g}
                        onChange={e => {
                          const novos = [...procedimentos];
                          const index = novos.findIndex(p => p === proc);
                          novos[index].preco_g = e.target.value;
                          setProcedimentos(novos);
                        }}
                        onBlur={() => proc.nome && salvarProcedimento(proc)}
                        disabled={!proc.requer_comprimento}
                        className="col-span-1 border border-slate-300 rounded-lg px-1 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
                      />
                      <input
                        type="number"
                        value={proc.porcentagem_profissional}
                        onChange={e => {
                          const novos = [...procedimentos];
                          const index = novos.findIndex(p => p === proc);
                          novos[index].porcentagem_profissional = e.target.value;
                          setProcedimentos(novos);
                        }}
                        onBlur={() => proc.nome && salvarProcedimento(proc)}
                        className="col-span-1 border border-slate-300 rounded-lg px-1 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <input
                        type="number"
                        value={proc.custo_variavel}
                        onChange={e => {
                          const novos = [...procedimentos];
                          const index = novos.findIndex(p => p === proc);
                          novos[index].custo_variavel = e.target.value;
                          setProcedimentos(novos);
                        }}
                        onBlur={() => proc.nome && salvarProcedimento(proc)}
                        className="col-span-1 border border-slate-300 rounded-lg px-1 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <div className="col-span-1 flex justify-center">
                        <input
                          type="checkbox"
                          checked={proc.ativo}
                          onChange={() => toggleAtivoProcedimento(proc.id, proc.ativo)}
                          className="w-4 h-4"
                        />
                      </div>
                      <button onClick={() => toggleAtivoProcedimento(proc.id, true)} className="col-span-1 text-red-400 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={adicionarProcedimento} className="mt-3 text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                  <Plus size={16} /> Adicionar
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════ ABA EQUIPE ═══════════════════════════════ */}
      {abaAtiva === 'equipe' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-slate-400 mb-2">
              <span className="col-span-5">Nome</span>
              <span className="col-span-3">Cargo</span>
              <span className="col-span-2 text-center">Salário Fixo R$</span>
              <span className="col-span-1 text-center">Ativo</span>
              <span className="col-span-1" />
            </div>
            {profissionais.map((prof, idx) => (
              <div key={prof.id || idx} className="grid grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  value={prof.nome}
                  onChange={e => {
                    const novos = [...profissionais];
                    novos[idx].nome = e.target.value;
                    setProfissionais(novos);
                  }}
                  onBlur={() => prof.nome && salvarProfissional(prof)}
                  placeholder="Nome"
                  className="col-span-5 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <select
                  value={prof.cargo}
                  onChange={e => {
                    const novos = [...profissionais];
                    novos[idx].cargo = e.target.value;
                    setProfissionais(novos);
                    salvarProfissional(novos[idx]);
                  }}
                  className="col-span-3 border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white outline-none"
                >
                  <option value="FUNCIONARIO">Funcionário</option>
                  <option value="PROPRIETARIO">Proprietário</option>
                </select>
                <input
                  type="number"
                  value={prof.salario_fixo}
                  onChange={e => {
                    const novos = [...profissionais];
                    novos[idx].salario_fixo = e.target.value;
                    setProfissionais(novos);
                  }}
                  onBlur={() => prof.nome && salvarProfissional(prof)}
                  className="col-span-2 border border-slate-300 rounded-lg px-2 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="col-span-1 flex justify-center">
                  <input
                    type="checkbox"
                    checked={prof.ativo}
                    onChange={() => toggleAtivoProfissional(prof.id, prof.ativo)}
                    className="w-4 h-4"
                  />
                </div>
                <button onClick={() => toggleAtivoProfissional(prof.id, true)} className="col-span-1 text-red-400 hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={adicionarProfissional} className="mt-4 text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
            <Plus size={16} /> Adicionar profissional
          </button>
        </div>
      )}

      {/* ═══════════════════════════════ ABA FINANCEIRO ═══════════════════════════════ */}
      {abaAtiva === 'financeiro' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Custo fixo por atendimento (R$)</label>
              <input
                type="number"
                step="0.01"
                value={config.custo_fixo_por_atendimento}
                onChange={e => setConfig({ ...config, custo_fixo_por_atendimento: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-slate-500 mt-1">Rateio de água, luz, aluguel por atendimento</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Taxa maquininha (%)</label>
              <input
                type="number"
                step="0.1"
                value={config.taxa_maquininha_pct}
                onChange={e => setConfig({ ...config, taxa_maquininha_pct: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-slate-500 mt-1">Percentual descontado em pagamentos com cartão</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Pró-labore mensal (R$)</label>
              <input
                type="number"
                step="0.01"
                value={config.prolabore_mensal}
                onChange={e => setConfig({ ...config, prolabore_mensal: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-slate-500 mt-1">Meta de retirada mensal para despesas pessoais</p>
            </div>

            <button
              onClick={salvarConfiguracoes}
              className="w-full py-3 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Salvar Configurações
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
