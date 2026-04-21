import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtData = (d) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');

const TIPOS_DESPESA = [
  { value: 'ALUGUEL', label: 'Aluguel', color: 'purple' },
  { value: 'ENERGIA', label: 'Energia/Luz', color: 'yellow' },
  { value: 'AGUA', label: 'Água', color: 'blue' },
  { value: 'INTERNET', label: 'Internet', color: 'indigo' },
  { value: 'MATERIAL', label: 'Material', color: 'green' },
  { value: 'EQUIPAMENTO', label: 'Equipamento', color: 'orange' },
  { value: 'FORNECEDOR', label: 'Fornecedor', color: 'pink' },
  { value: 'FUNCIONARIO', label: 'Funcionário', color: 'rose' },
  { value: 'OUTRO', label: 'Outro', color: 'gray' }
];

const getBadgeColor = (tipo) => {
  const t = TIPOS_DESPESA.find(td => td.value === tipo);
  const colors = {
    purple: 'bg-purple-100 text-purple-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    blue: 'bg-blue-100 text-blue-700',
    indigo: 'bg-indigo-100 text-indigo-700',
    green: 'bg-green-100 text-green-700',
    orange: 'bg-orange-100 text-orange-700',
    pink: 'bg-pink-100 text-pink-700',
    rose: 'bg-rose-100 text-rose-700',
    gray: 'bg-gray-100 text-gray-700'
  };
  return colors[t?.color] || colors.gray;
};

export default function Despesas({ salaoId }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [despesas, setDespesas] = useState([]);
  const [mesSelecionado, setMesSelecionado] = useState('');
  const [meses, setMeses] = useState([]);
  
  const [modalAberto, setModalAberto] = useState(false);
  const [despesaEditando, setDespesaEditando] = useState(null);
  const [form, setForm] = useState({ data: '', descricao: '', tipo: 'OUTRO', valor: '', valor_pago: '' });

  useEffect(() => {
    const mesesArray = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      mesesArray.push(mes);
    }
    setMeses(mesesArray);
    setMesSelecionado(mesesArray[0]);
  }, []);

  useEffect(() => {
    if (mesSelecionado) carregarDespesas();
  }, [mesSelecionado, salaoId]);

  const carregarDespesas = async () => {
    setLoading(true);
    try {
      const [ano, mes] = mesSelecionado.split('-');
      const inicioMes = `${ano}-${mes}-01`;
      const fimMes = new Date(ano, mes, 0).toISOString().split('T')[0];

      const { data } = await supabase
        .from('despesas')
        .select('*')
        .eq('salao_id', salaoId)
        .gte('data', inicioMes)
        .lte('data', fimMes)
        .order('data', { ascending: false });

      setDespesas(data || []);
    } catch (error) {
      showToast('Erro ao carregar despesas', 'error');
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = (despesa = null) => {
    if (despesa) {
      setDespesaEditando(despesa);
      setForm({
        data: despesa.data,
        descricao: despesa.descricao,
        tipo: despesa.tipo,
        valor: despesa.valor,
        valor_pago: despesa.valor_pago
      });
    } else {
      setDespesaEditando(null);
      setForm({ data: new Date().toISOString().split('T')[0], descricao: '', tipo: 'OUTRO', valor: '', valor_pago: '' });
    }
    setModalAberto(true);
  };

  const salvar = async () => {
    try {
      if (despesaEditando) {
        await supabase.from('despesas').update({
          data: form.data,
          descricao: form.descricao,
          tipo: form.tipo,
          valor: Number(form.valor),
          valor_pago: Number(form.valor_pago)
        }).eq('id', despesaEditando.id).eq('salao_id', salaoId);
        showToast('Despesa atualizada', 'success');
      } else {
        await supabase.from('despesas').insert({
          salao_id: salaoId,
          data: form.data,
          descricao: form.descricao,
          tipo: form.tipo,
          valor: Number(form.valor),
          valor_pago: Number(form.valor_pago)
        });
        showToast('Despesa criada', 'success');
      }
      setModalAberto(false);
      carregarDespesas();
    } catch (error) {
      showToast('Erro ao salvar', 'error');
    }
  };

  const deletar = async (id) => {
    if (!confirm('Deletar esta despesa?')) return;
    try {
      await supabase.from('despesas').delete().eq('id', id).eq('salao_id', salaoId);
      showToast('Despesa deletada', 'success');
      carregarDespesas();
    } catch (error) {
      showToast('Erro ao deletar', 'error');
    }
  };

  const totalMes = despesas.reduce((acc, d) => acc + Number(d.valor || 0), 0);
  const totalPago = despesas.reduce((acc, d) => acc + Number(d.valor_pago || 0), 0);
  const totalPendente = despesas.reduce((acc, d) => acc + Number(d.valor_pendente || 0), 0);

  if (loading) return <div className="p-10 text-center">Carregando...</div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <PageHeader 
        title="Despesas" 
        subtitle="Controle de gastos mensais"
        action={
          <div className="flex gap-3">
            <select
              value={mesSelecionado}
              onChange={e => setMesSelecionado(e.target.value)}
              className="border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white outline-none"
            >
              {meses.map(m => (
                <option key={m} value={m}>
                  {new Date(m + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </option>
              ))}
            </select>
            <button
              onClick={() => abrirModal()}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <Plus size={18} /> Nova Despesa
            </button>
          </div>
        }
      />

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Total do Mês</p>
          <p className="text-2xl font-bold text-slate-900">{fmt(totalMes)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Total Pago</p>
          <p className="text-2xl font-bold text-emerald-600">{fmt(totalPago)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Total Pendente</p>
          <p className="text-2xl font-bold text-amber-600">{fmt(totalPendente)}</p>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Data</th>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Descrição</th>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Tipo</th>
              <th className="text-right px-4 py-3 font-medium text-slate-700">Valor</th>
              <th className="text-right px-4 py-3 font-medium text-slate-700">Pago</th>
              <th className="text-right px-4 py-3 font-medium text-slate-700">Pendente</th>
              <th className="text-center px-4 py-3 font-medium text-slate-700">Ações</th>
            </tr>
          </thead>
          <tbody>
            {despesas.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-8 text-slate-400">Nenhuma despesa neste mês</td>
              </tr>
            ) : (
              despesas.map(desp => (
                <tr key={desp.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">{fmtData(desp.data)}</td>
                  <td className="px-4 py-3 font-medium">{desp.descricao}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(desp.tipo)}`}>
                      {TIPOS_DESPESA.find(t => t.value === desp.tipo)?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{fmt(desp.valor)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{fmt(desp.valor_pago)}</td>
                  <td className="px-4 py-3 text-right text-amber-600">{fmt(desp.valor_pendente)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => abrirModal(desp)} className="text-blue-500 hover:text-blue-700">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => deletar(desp.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={despesaEditando ? 'Editar Despesa' : 'Nova Despesa'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
            <input
              type="date"
              value={form.data}
              onChange={e => setForm({ ...form, data: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
            <input
              type="text"
              value={form.descricao}
              onChange={e => setForm({ ...form, descricao: e.target.value.toUpperCase() })}
              placeholder="Ex: Aluguel do salão"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
            <select
              value={form.tipo}
              onChange={e => setForm({ ...form, tipo: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {TIPOS_DESPESA.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor Total (R$)</label>
              <input
                type="number"
                step="0.01"
                value={form.valor}
                onChange={e => setForm({ ...form, valor: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor Pago (R$)</label>
              <input
                type="number"
                step="0.01"
                value={form.valor_pago}
                onChange={e => setForm({ ...form, valor_pago: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setModalAberto(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={salvar}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Salvar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
