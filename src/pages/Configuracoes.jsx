import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import PageHeader from '../components/PageHeader';
import { Trash2, Plus } from 'lucide-react';

const CATEGORIAS = ['CABELO', 'UNHAS', 'ESTETICA', 'OUTROS'];
const DIAS_SEMANA = [
  { key: 'seg', label: 'Segunda' },
  { key: 'ter', label: 'Terça' },
  { key: 'qua', label: 'Quarta' },
  { key: 'qui', label: 'Quinta' },
  { key: 'sex', label: 'Sexta' },
  { key: 'sab', label: 'Sábado' },
  { key: 'dom', label: 'Domingo' },
];

const Configuracoes = ({ salaoId }) => {
  const { showToast } = useToast();
  const [abaAtiva, setAbaAtiva] = useState('procedimentos');
  const [loading, setLoading] = useState(true);

  // Estados
  const [procedimentos, setProcedimentos] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [horario, setHorario] = useState({});
  const [despesas, setDespesas] = useState([]);

  useEffect(() => {
    carregarDados();
  }, [salaoId]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [procRes, profRes, salaoRes, despRes] = await Promise.all([
        supabase.from('procedimentos').select('*').eq('salao_id', salaoId).eq('ativo', true),
        supabase.from('profissionais').select('*').eq('salao_id', salaoId).eq('ativo', true),
        supabase.from('saloes').select('horario').eq('id', salaoId).single(),
        supabase.from('despesas').select('*').eq('salao_id', salaoId).eq('tipo', 'FIXA')
      ]);

      if (procRes.data) setProcedimentos(procRes.data);
      if (profRes.data) setProfissionais(profRes.data);
      if (salaoRes.data?.horario) setHorario(salaoRes.data.horario);
      if (despRes.data) setDespesas(despRes.data);
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
        await supabase.from('procedimentos').update({ nome: proc.nome, valor: proc.valor, categoria: proc.categoria }).eq('id', proc.id);
      } else {
        await supabase.from('procedimentos').insert({ ...proc, salao_id: salaoId, ativo: true });
      }
      showToast('Salvo', 'success');
      carregarDados();
    } catch (error) {
      showToast('Erro ao salvar', 'error');
    }
  };

  const deletarProcedimento = async (id) => {
    if (!confirm('Deletar este procedimento?')) return;
    try {
      await supabase.from('procedimentos').update({ ativo: false }).eq('id', id);
      showToast('Deletado', 'success');
      carregarDados();
    } catch (error) {
      showToast('Erro ao deletar', 'error');
    }
  };

  const adicionarProcedimento = () => {
    setProcedimentos([...procedimentos, { id: null, nome: '', valor: 0, categoria: 'OUTROS', temp: true }]);
  };

  // ═══════════════════════════════ PROFISSIONAIS ═══════════════════════════════
  const salvarProfissional = async (prof) => {
    try {
      if (prof.id) {
        await supabase.from('profissionais').update({ nome: prof.nome, cargo: prof.cargo, comissao_percentual: prof.comissao_percentual }).eq('id', prof.id);
      } else {
        await supabase.from('profissionais').insert({ ...prof, salao_id: salaoId, ativo: true });
      }
      showToast('Salvo', 'success');
      carregarDados();
    } catch (error) {
      showToast('Erro ao salvar', 'error');
    }
  };

  const deletarProfissional = async (id) => {
    if (!confirm('Deletar este profissional?')) return;
    try {
      await supabase.from('profissionais').update({ ativo: false }).eq('id', id);
      showToast('Deletado', 'success');
      carregarDados();
    } catch (error) {
      showToast('Erro ao deletar', 'error');
    }
  };

  const adicionarProfissional = () => {
    setProfissionais([...profissionais, { id: null, nome: '', cargo: 'FUNCIONARIO', comissao_percentual: 40, temp: true }]);
  };

  // ═══════════════════════════════ HORÁRIOS ═══════════════════════════════
  const salvarHorarios = async () => {
    try {
      await supabase.from('saloes').update({ horario }).eq('id', salaoId);
      showToast('Horários salvos', 'success');
    } catch (error) {
      showToast('Erro ao salvar horários', 'error');
    }
  };

  // ═══════════════════════════════ DESPESAS ═══════════════════════════════
  const salvarDespesa = async (desp) => {
    try {
      if (desp.id) {
        await supabase.from('despesas').update({ descricao: desp.descricao, valor: desp.valor }).eq('id', desp.id);
      } else {
        await supabase.from('despesas').insert({ ...desp, salao_id: salaoId, tipo: 'FIXA', data: new Date().toISOString().split('T')[0], valor_pago: 0 });
      }
      showToast('Salvo', 'success');
      carregarDados();
    } catch (error) {
      showToast('Erro ao salvar', 'error');
    }
  };

  const deletarDespesa = async (id) => {
    if (!confirm('Deletar esta despesa?')) return;
    try {
      await supabase.from('despesas').delete().eq('id', id);
      showToast('Deletado', 'success');
      carregarDados();
    } catch (error) {
      showToast('Erro ao deletar', 'error');
    }
  };

  const adicionarDespesa = () => {
    setDespesas([...despesas, { id: null, descricao: '', valor: 0, temp: true }]);
  };

  if (loading) return <div className="p-10 text-center">Carregando...</div>;

  const totalDespesas = despesas.reduce((acc, d) => acc + Number(d.valor || 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <PageHeader title="Configurações" subtitle="Gerencie procedimentos, equipe, horários e despesas" />

      {/* Abas */}
      <div className="flex gap-6 border-b border-slate-200 mb-6">
        {[
          { key: 'procedimentos', label: 'Procedimentos' },
          { key: 'equipe', label: 'Equipe' },
          { key: 'horarios', label: 'Horários' },
          { key: 'despesas', label: 'Despesas' }
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
                  {procsCategoria.map((proc, idx) => (
                    <div key={proc.id || idx} className="flex gap-2 items-center">
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
                        placeholder="Nome do procedimento"
                        className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-slate-400 text-sm">R$</span>
                        <input
                          type="number"
                          value={proc.valor}
                          onChange={e => {
                            const novos = [...procedimentos];
                            const index = novos.findIndex(p => p === proc);
                            novos[index].valor = e.target.value;
                            setProcedimentos(novos);
                          }}
                          onBlur={() => proc.nome && salvarProcedimento(proc)}
                          placeholder="0"
                          className="w-28 border border-slate-300 rounded-lg pl-7 pr-2 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <button onClick={() => deletarProcedimento(proc.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={18} />
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
            <div className="flex gap-2 text-xs text-slate-400 mb-2">
              <span className="flex-1">Nome</span>
              <span className="w-32">Cargo</span>
              <span className="w-20 text-center">Comissão %</span>
              <span className="w-8" />
            </div>
            {profissionais.map((prof, idx) => (
              <div key={prof.id || idx} className="flex gap-2 items-center">
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
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <select
                  value={prof.cargo}
                  onChange={e => {
                    const novos = [...profissionais];
                    novos[idx].cargo = e.target.value;
                    setProfissionais(novos);
                    salvarProfissional(novos[idx]);
                  }}
                  className="w-32 border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white outline-none"
                >
                  <option value="FUNCIONARIO">Funcionário</option>
                  <option value="SOCIO">Sócio</option>
                </select>
                <input
                  type="number"
                  value={prof.comissao_percentual}
                  onChange={e => {
                    const novos = [...profissionais];
                    novos[idx].comissao_percentual = e.target.value;
                    setProfissionais(novos);
                  }}
                  onBlur={() => prof.nome && salvarProfissional(prof)}
                  className="w-20 border border-slate-300 rounded-lg px-2 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button onClick={() => deletarProfissional(prof.id)} className="text-red-400 hover:text-red-600">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={adicionarProfissional} className="mt-4 text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
            <Plus size={16} /> Adicionar profissional
          </button>
        </div>
      )}

      {/* ═══════════════════════════════ ABA HORÁRIOS ═══════════════════════════════ */}
      {abaAtiva === 'horarios' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {DIAS_SEMANA.map((dia, i) => (
            <div key={dia.key} className={`flex items-center gap-3 px-4 py-3 ${i < DIAS_SEMANA.length - 1 ? 'border-b border-slate-100' : ''}`}>
              <input
                type="checkbox"
                checked={horario[dia.key]?.aberto || false}
                onChange={e => setHorario({ ...horario, [dia.key]: { ...horario[dia.key], aberto: e.target.checked } })}
                className="w-4 h-4"
              />
              <span className="text-sm w-16 font-medium text-slate-700">{dia.label}</span>
              {horario[dia.key]?.aberto && (
                <div className="flex items-center gap-2 ml-auto">
                  <input
                    type="time"
                    value={horario[dia.key]?.abertura || '08:00'}
                    onChange={e => setHorario({ ...horario, [dia.key]: { ...horario[dia.key], abertura: e.target.value } })}
                    className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
                  />
                  <span className="text-slate-400 text-xs">até</span>
                  <input
                    type="time"
                    value={horario[dia.key]?.fechamento || '18:00'}
                    onChange={e => setHorario({ ...horario, [dia.key]: { ...horario[dia.key], fechamento: e.target.value } })}
                    className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
                  />
                </div>
              )}
            </div>
          ))}
          <div className="p-4 bg-slate-50 flex justify-center">
            <button onClick={salvarHorarios} className="px-6 py-2 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600">
              Salvar horários
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════ ABA DESPESAS ═══════════════════════════════ */}
      {abaAtiva === 'despesas' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="space-y-2">
            <div className="flex gap-2 text-xs text-slate-400 mb-2">
              <span className="flex-1">Despesa</span>
              <span className="w-32">Valor mensal (R$)</span>
              <span className="w-8" />
            </div>
            {despesas.map((desp, idx) => (
              <div key={desp.id || idx} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={desp.descricao}
                  onChange={e => {
                    const novos = [...despesas];
                    novos[idx].descricao = e.target.value;
                    setDespesas(novos);
                  }}
                  onBlur={() => desp.descricao && salvarDespesa(desp)}
                  placeholder="Ex: Aluguel"
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-slate-400 text-sm">R$</span>
                  <input
                    type="number"
                    value={desp.valor}
                    onChange={e => {
                      const novos = [...despesas];
                      novos[idx].valor = e.target.value;
                      setDespesas(novos);
                    }}
                    onBlur={() => desp.descricao && salvarDespesa(desp)}
                    placeholder="0,00"
                    className="w-32 border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button onClick={() => deletarDespesa(desp.id)} className="text-red-400 hover:text-red-600">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={adicionarDespesa} className="mt-4 text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
            <Plus size={16} /> Adicionar despesa
          </button>
          <div className="mt-6 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">Total fixo mensal: <strong className="text-slate-900">R$ {totalDespesas.toFixed(2)}</strong></p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Configuracoes;