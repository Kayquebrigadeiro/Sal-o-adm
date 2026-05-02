import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from './Toast';
import { Plus, Trash2, Home, Zap, Droplets, Wifi, ShoppingBag, Wrench } from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ICONES = { ALUGUEL: Home, ENERGIA: Zap, AGUA: Droplets, INTERNET: Wifi, MATERIAL: ShoppingBag };
const TIPOS = [
  { value: 'ALUGUEL', label: 'Aluguel' }, { value: 'ENERGIA', label: 'Energia' },
  { value: 'AGUA', label: 'Água' }, { value: 'INTERNET', label: 'Internet' },
  { value: 'MATERIAL', label: 'Material' }, { value: 'EQUIPAMENTO', label: 'Equipamento' },
  { value: 'FUNCIONARIO', label: 'Funcionário' }, { value: 'OUTRO', label: 'Outro' },
];

export default function BaseCustos({ salaoId, qtdAtendimentos, onCustoFixoChange }) {
  const { showToast } = useToast();
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (salaoId) carregar(); }, [salaoId]);

  const carregar = async () => {
    setLoading(true);
    const { data } = await supabase.from('custos_fixos_itens').select('id, descricao, tipo, valor').eq('salao_id', salaoId).order('descricao');
    setItens(data || []);
    setLoading(false);
    recalcularRateio(data || []);
  };

  const recalcularRateio = (lista) => {
    const total = lista.reduce((a, i) => a + Number(i.valor || 0), 0);
    const qtd = Math.max(Number(qtdAtendimentos) || 1, 1);
    const rateado = Math.round((total / qtd) * 100) / 100;
    if (onCustoFixoChange) onCustoFixoChange(rateado, total);
  };

  const addItem = async () => {
    const { error } = await supabase.from('custos_fixos_itens').insert({ salao_id: salaoId, descricao: '', tipo: 'OUTRO', valor: 0 });
    if (error) showToast('Erro: ' + error.message, 'error');
    else carregar();
  };

  const updateItem = async (id, campo, valor) => {
    setItens(prev => prev.map(i => i.id === id ? { ...i, [campo]: valor } : i));
  };

  const salvarItem = async (item) => {
    const v = Number(item.valor) || 0;
    const { error } = await supabase.from('custos_fixos_itens')
      .update({ descricao: item.descricao, tipo: item.tipo, valor: v, valor_mensal: v })
      .eq('id', item.id).eq('salao_id', salaoId);
    if (error) showToast('Erro ao salvar', 'error');
    else { showToast('✓ Salvo', 'success'); recalcularRateio(itens); }
  };

  const deletarItem = async (id) => {
    await supabase.from('custos_fixos_itens').delete().eq('id', id).eq('salao_id', salaoId);
    carregar();
    showToast('Removido', 'success');
  };

  const total = itens.reduce((a, i) => a + Number(i.valor || 0), 0);
  const qtd = Math.max(Number(qtdAtendimentos) || 1, 1);
  const rateado = Math.round((total / qtd) * 100) / 100;

  if (loading) return <div className="py-12 text-center text-slate-400 animate-pulse">Carregando base de custos...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Total Mensal</p>
          <p className="text-2xl font-black text-slate-800">{fmt(total)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Atendimentos/Mês</p>
          <p className="text-2xl font-black text-blue-600">{qtd}</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-5">
          <p className="text-[10px] font-bold text-emerald-600 uppercase">Custo Fixo Rateado</p>
          <p className="text-2xl font-black text-emerald-700">{fmt(rateado)}</p>
          <p className="text-[10px] text-emerald-500 mt-1">{fmt(total)} ÷ {qtd} atend.</p>
        </div>
      </div>

      {/* Tabela editável */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-white text-[10px] uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Descrição</th>
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-right px-4 py-3">Valor Mensal (R$)</th>
              <th className="text-center px-4 py-3 w-16">Ações</th>
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-10 text-slate-400">Nenhum custo fixo cadastrado</td></tr>
            ) : itens.map(item => {
              const Icon = ICONES[item.tipo] || Wrench;
              return (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Icon size={14} className="text-slate-400 flex-shrink-0" />
                      <input type="text" className="w-full bg-transparent border-0 outline-none font-bold text-slate-800 focus:bg-slate-50 px-1 rounded"
                        value={item.descricao} onChange={e => updateItem(item.id, 'descricao', e.target.value.toUpperCase())}
                        onBlur={() => salvarItem(item)} placeholder="Ex: ALUGUEL" />
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <select className="bg-transparent border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none"
                      value={item.tipo} onChange={e => { updateItem(item.id, 'tipo', e.target.value); setTimeout(() => salvarItem({...item, tipo: e.target.value}), 0); }}>
                      {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" step="0.01" className="w-full bg-transparent border-0 outline-none font-black text-right text-slate-800 focus:bg-slate-50 px-1 rounded"
                      value={item.valor} onChange={e => updateItem(item.id, 'valor', e.target.value)}
                      onBlur={() => salvarItem(item)} />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button onClick={() => deletarItem(item.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button onClick={addItem} className="flex items-center gap-2 text-sm text-emerald-600 font-bold hover:text-emerald-700">
        <Plus size={16} /> Adicionar Custo Fixo
      </button>
    </div>
  );
}
