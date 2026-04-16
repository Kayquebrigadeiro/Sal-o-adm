import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { Plus, Trash2, Pencil, Zap, Calculator, Save, ArrowRight } from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function CustosFixos({ salaoId }) {
  const { showToast } = useToast();
  const [itens, setItens] = useState([]);
  const [config, setConfig] = useState({ custo_fixo_por_atendimento: 0, qtd_atendimentos_mes: 100 });
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ descricao: '', valor_mensal: '' });

  useEffect(() => {
    if (salaoId) carregar();
  }, [salaoId]);

  const carregar = async () => {
    setLoading(true);
    const [itensRes, cfgRes] = await Promise.all([
      supabase.from('custos_fixos_itens').select('*').eq('salao_id', salaoId).eq('ativo', true).order('descricao'),
      supabase.from('configuracoes').select('custo_fixo_por_atendimento, qtd_atendimentos_mes').eq('salao_id', salaoId).single(),
    ]);
    setItens(itensRes.data || []);
    if (cfgRes.data) {
      setConfig({
        custo_fixo_por_atendimento: Number(cfgRes.data.custo_fixo_por_atendimento),
        qtd_atendimentos_mes: Number(cfgRes.data.qtd_atendimentos_mes) || 100,
      });
    }
    setLoading(false);
  };

  // Cálculos automáticos
  const somaMensal = useMemo(() => itens.reduce((acc, i) => acc + Number(i.valor_mensal || 0), 0), [itens]);
  const custoRateado = useMemo(() => {
    const qtd = config.qtd_atendimentos_mes || 1;
    return Math.round((somaMensal / qtd) * 100) / 100;
  }, [somaMensal, config.qtd_atendimentos_mes]);

  // CRUD
  const abrirModal = (item = null) => {
    if (item) { setEditando(item); setForm({ descricao: item.descricao, valor_mensal: item.valor_mensal }); }
    else { setEditando(null); setForm({ descricao: '', valor_mensal: '' }); }
    setModalAberto(true);
  };

  const salvar = async () => {
    if (!form.descricao) return showToast('Descrição obrigatória', 'error');
    const dados = { salao_id: salaoId, descricao: form.descricao, valor_mensal: Number(form.valor_mensal) || 0 };
    let error;
    if (editando) {
      ({ error } = await supabase.from('custos_fixos_itens').update(dados).eq('id', editando.id));
    } else {
      ({ error } = await supabase.from('custos_fixos_itens').insert(dados));
    }
    if (error) showToast('Erro: ' + error.message, 'error');
    else { showToast('Custo salvo!', 'success'); setModalAberto(false); carregar(); }
  };

  const deletar = async (id) => {
    if (!confirm('Remover este custo?')) return;
    await supabase.from('custos_fixos_itens').update({ ativo: false }).eq('id', id);
    showToast('Removido', 'success');
    carregar();
  };

  // Atualizar qtd atendimentos/mês
  const atualizarQtd = async (valor) => {
    setConfig(prev => ({ ...prev, qtd_atendimentos_mes: Number(valor) }));
  };

  // Salvar rateio na tabela configurações
  const aplicarRateio = async () => {
    const { error } = await supabase.from('configuracoes').update({
      custo_fixo_por_atendimento: custoRateado,
      qtd_atendimentos_mes: config.qtd_atendimentos_mes,
    }).eq('salao_id', salaoId);
    if (error) showToast('Erro: ' + error.message, 'error');
    else {
      setConfig(prev => ({ ...prev, custo_fixo_por_atendimento: custoRateado }));
      showToast(`Custo fixo atualizado para ${fmt(custoRateado)} por atendimento!`, 'success');
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-400 animate-pulse">Carregando custos...</div>;

  const rateioMudou = custoRateado !== config.custo_fixo_por_atendimento;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <PageHeader
        title="Custos Fixos Operacionais"
        subtitle="Lista detalhada com rateio automático por atendimento"
        action={
          <button onClick={() => abrirModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg font-bold text-sm">
            <Plus size={18} /> Novo Custo
          </button>
        }
      />

      {/* ═══ CARD DE RATEIO AUTOMÁTICO ═══ */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 mb-8 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Total Mensal</p>
            <p className="text-2xl font-black">{fmt(somaMensal)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">÷</p>
            <div className="flex items-center gap-2">
              <input type="number" min="1" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 w-24 text-center font-black text-xl outline-none focus:border-emerald-400"
                value={config.qtd_atendimentos_mes}
                onChange={e => atualizarQtd(e.target.value)} />
              <span className="text-xs text-slate-400">cab/mês</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">=</p>
            <p className="text-2xl font-black text-emerald-400 flex items-center gap-2">
              <Calculator size={18} /> {fmt(custoRateado)}
              <span className="text-[10px] text-slate-400 font-normal">/atendimento</span>
            </p>
          </div>
          <div>
            {rateioMudou ? (
              <button onClick={aplicarRateio}
                className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30">
                <Save size={16} /> Aplicar
              </button>
            ) : (
              <div className="w-full bg-slate-700 text-slate-400 py-3 rounded-xl font-bold text-center text-sm">
                ✓ Atualizado
              </div>
            )}
          </div>
        </div>

        {rateioMudou && (
          <div className="mt-4 pt-4 border-t border-slate-700 flex items-center gap-2 text-sm">
            <Zap size={14} className="text-amber-400" />
            <span className="text-slate-300">
              Valor atual: <b className="text-white">{fmt(config.custo_fixo_por_atendimento)}</b>
              <ArrowRight size={12} className="inline mx-2 text-emerald-400" />
              Novo: <b className="text-emerald-400">{fmt(custoRateado)}</b>
            </span>
          </div>
        )}
      </div>

      {/* ═══ TABELA DE ITENS ═══ */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Descrição</th>
              <th className="text-right px-4 py-3 font-medium text-slate-700">Valor Mensal</th>
              <th className="text-right px-4 py-3 font-medium text-slate-700">Por Atendimento</th>
              <th className="text-center px-4 py-3 font-medium text-slate-700">Ações</th>
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-10 text-slate-400">
                Nenhum custo cadastrado. Adicione seus custos fixos (aluguel, energia, água...).
              </td></tr>
            ) : itens.map(item => {
              const porAtend = config.qtd_atendimentos_mes > 0
                ? Math.round((Number(item.valor_mensal) / config.qtd_atendimentos_mes) * 100) / 100
                : 0;
              return (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-800">{item.descricao}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{fmt(item.valor_mensal)}</td>
                  <td className="px-4 py-3 text-right font-bold text-indigo-600">{fmt(porAtend)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => abrirModal(item)} className="text-blue-500 hover:text-blue-700"><Pencil size={14} /></button>
                      <button onClick={() => deletar(item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {itens.length > 0 && (
              <tr className="bg-slate-50 font-bold">
                <td className="px-4 py-3 text-slate-700">TOTAL</td>
                <td className="px-4 py-3 text-right text-slate-800">{fmt(somaMensal)}</td>
                <td className="px-4 py-3 text-right text-indigo-700">{fmt(custoRateado)}</td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ═══ MODAL ═══ */}
      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={editando ? 'Editar Custo' : 'Novo Custo Fixo'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Descrição</label>
            <input type="text" className="w-full border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-slate-800"
              value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Ex: Aluguel, Energia, Água..." />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Valor Mensal (R$)</label>
            <input type="number" step="0.01" className="w-full border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-slate-800"
              value={form.valor_mensal} onChange={e => setForm({...form, valor_mensal: e.target.value})} placeholder="190.00" />
          </div>
          <button onClick={salvar}
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
            {editando ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
