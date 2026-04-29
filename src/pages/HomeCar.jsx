import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import { FinancialEngine } from '../services/FinancialEngine';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { Plus, Pencil, Trash2, TrendingUp, AlertTriangle } from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtData = (d) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');

export default function HomeCar({ salaoId }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [vendas, setVendas] = useState([]);
  const [mesSelecionado, setMesSelecionado] = useState('');
  const [meses, setMeses] = useState([]);
  
  const [modalAberto, setModalAberto] = useState(false);
  const [vendaEditando, setVendaEditando] = useState(null);
  const [form, setForm] = useState({
    data: '',
    cliente: '',
    produto: '',
    custo_produto: '',
    valor_venda: '',
    valor_pago: '',
    obs: ''
  });

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
    if (mesSelecionado) carregarVendas();
  }, [mesSelecionado, salaoId]);

  const carregarVendas = async () => {
    setLoading(true);
    try {
      const [ano, mes] = mesSelecionado.split('-');
      const inicioMes = `${ano}-${mes}-01`;
      const fimMes = new Date(ano, mes, 0).toISOString().split('T')[0];

      const { data } = await supabase
        .from('homecare')
        .select('*')
        .eq('salao_id', salaoId)
        .gte('data', inicioMes)
        .lte('data', fimMes)
        .order('data', { ascending: false });

      setVendas(data || []);
    } catch (error) {
      showToast('Erro ao carregar vendas', 'error');
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = (venda = null) => {
    if (venda) {
      setVendaEditando(venda);
      setForm({
        data: venda.data,
        cliente: venda.cliente,
        produto: venda.produto,
        custo_produto: venda.custo_produto,
        valor_venda: venda.valor_venda,
        valor_pago: venda.valor_pago,
        obs: venda.obs || ''
      });
    } else {
      setVendaEditando(null);
      setForm({
        data: new Date().toISOString().split('T')[0],
        cliente: '',
        produto: '',
        custo_produto: '',
        valor_venda: '',
        valor_pago: '',
        obs: ''
      });
    }
    setModalAberto(true);
  };

  const salvar = async () => {
    try {
      const dados = {
        salao_id: salaoId,
        data: form.data,
        cliente: form.cliente,
        produto: form.produto,
        custo_produto: Number(form.custo_produto),
        valor_venda: Number(form.valor_venda),
        valor_pago: Number(form.valor_pago),
        obs: form.obs
      };

      if (vendaEditando) {
        await supabase.from('homecare').update(dados).eq('id', vendaEditando.id).eq('salao_id', salaoId);
        showToast('Atualizado', 'success');
      } else {
        await supabase.from('homecare').insert(dados);
        showToast('Criado', 'success');
      }
      setModalAberto(false);
      carregarVendas();
    } catch (error) {
      showToast('Erro ao salvar', 'error');
    }
  };

  const deletar = async (id) => {
    if (!confirm('Deletar esta venda?')) return;
    try {
      await supabase.from('homecare').delete().eq('id', id).eq('salao_id', salaoId);
      showToast('Deletado', 'success');
      carregarVendas();
    } catch (error) {
      showToast('Erro ao deletar', 'error');
    }
  };

  const totalVendas = vendas.reduce((acc, v) => acc + Number(v.valor_venda || 0), 0);
  const totalRecebido = vendas.reduce((acc, v) => acc + Number(v.valor_pago || 0), 0);
  const totalLucro = vendas.reduce((acc, v) => acc + Number(v.lucro || 0), 0);
  const totalPendente = vendas.reduce((acc, v) => acc + Number(v.valor_pendente || 0), 0);

  if (loading) return <div className="p-10 text-center">Carregando...</div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <PageHeader 
        title="HomeCare" 
        subtitle="Venda de produtos para uso em casa"
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
              <Plus size={18} /> Nova Venda
            </button>
          </div>
        }
      />

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Total Vendas</p>
          <p className="text-2xl font-bold text-slate-900">{fmt(totalVendas)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Total Recebido</p>
          <p className="text-2xl font-bold text-emerald-600">{fmt(totalRecebido)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Lucro Total</p>
          <p className="text-2xl font-bold text-blue-600">{fmt(totalLucro)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Pendências</p>
          <p className="text-2xl font-bold text-amber-600">{fmt(totalPendente)}</p>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Data</th>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Cliente</th>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Produto</th>
              <th className="text-right px-4 py-3 font-medium text-slate-700">Custo</th>
              <th className="text-right px-4 py-3 font-medium text-slate-700">Venda</th>
              <th className="text-right px-4 py-3 font-medium text-slate-700">Pago</th>
              <th className="text-right px-4 py-3 font-medium text-slate-700">Lucro</th>
              <th className="text-right px-4 py-3 font-medium text-slate-700">Pendente</th>
              <th className="text-center px-4 py-3 font-medium text-slate-700">Ações</th>
            </tr>
          </thead>
          <tbody>
            {vendas.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-8 text-slate-400">Nenhuma venda neste mês</td>
              </tr>
            ) : (
              vendas.map(venda => (
                <tr key={venda.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">{fmtData(venda.data)}</td>
                  <td className="px-4 py-3 font-medium">{venda.cliente}</td>
                  <td className="px-4 py-3">{venda.produto}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{fmt(venda.custo_produto)}</td>
                  <td className="px-4 py-3 text-right">{fmt(venda.valor_venda)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{fmt(venda.valor_pago)}</td>
                  <td className="px-4 py-3 text-right text-blue-600">{fmt(venda.lucro)}</td>
                  <td className="px-4 py-3 text-right text-amber-600">{fmt(venda.valor_pendente)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => abrirModal(venda)} className="text-blue-500 hover:text-blue-700">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => deletar(venda.id)} className="text-red-500 hover:text-red-700">
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
      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={vendaEditando ? 'Editar Venda' : 'Nova Venda'}>
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
            <input
              type="text"
              value={form.cliente}
              onChange={e => setForm({ ...form, cliente: e.target.value.toUpperCase() })}
              placeholder="Nome do cliente"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Produto</label>
            <input
              type="text"
              value={form.produto}
              onChange={e => setForm({ ...form, produto: e.target.value.toUpperCase() })}
              placeholder="Ex: Shampoo Kerastase"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Custo (R$)</label>
              <input
                type="number"
                step="0.01"
                value={form.custo_produto}
                onChange={e => setForm({ ...form, custo_produto: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Venda (R$)</label>
              <input
                type="number"
                step="0.01"
                value={form.valor_venda}
                onChange={e => setForm({ ...form, valor_venda: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pago (R$)</label>
              <input
                type="number"
                step="0.01"
                value={form.valor_pago}
                onChange={e => setForm({ ...form, valor_pago: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* ─── Preview de Lucro (Motor Financeiro) ─── */}
          {(form.valor_venda && form.custo_produto) && (() => {
            const preview = FinancialEngine.calcularHomeCare({
              valorVenda: Number(form.valor_venda) || 0,
              custoProduto: Number(form.custo_produto) || 0,
              valorPago: Number(form.valor_pago) || 0,
            });
            return (
              <div className={`rounded-xl p-4 border ${preview.lucro < 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {preview.lucro < 0 ? (
                    <AlertTriangle size={14} className="text-red-500" />
                  ) : (
                    <TrendingUp size={14} className="text-emerald-600" />
                  )}
                  <span className="text-xs font-bold text-slate-600 uppercase">Preview Financeiro</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold">LUCRO</p>
                    <p className={`text-lg font-black ${preview.lucro < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {fmt(preview.lucro)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold">MARGEM</p>
                    <p className={`text-lg font-black ${preview.margemLucro < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {preview.margemLucro.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold">PENDÊNCIA</p>
                    <p className={`text-lg font-black ${preview.pendencia > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                      {fmt(preview.pendencia)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Observação</label>
            <textarea
              value={form.obs}
              onChange={e => setForm({ ...form, obs: e.target.value.toUpperCase() })}
              placeholder="Observações adicionais..."
              rows="3"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
            />
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
