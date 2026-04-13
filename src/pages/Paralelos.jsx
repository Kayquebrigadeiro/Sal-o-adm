import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtData = (d) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');

export default function Paralelos({ salaoId }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [paralelos, setParalelos] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [mesSelecionado, setMesSelecionado] = useState('');
  const [meses, setMeses] = useState([]);
  
  const [modalAberto, setModalAberto] = useState(false);
  const [paraleloEditando, setParaleloEditando] = useState(null);
  const [form, setForm] = useState({
    data: '',
    cliente: '',
    descricao: '',
    profissional_id: '',
    valor: '',
    valor_pago: '',
    valor_profissional: ''
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
    if (mesSelecionado) carregarDados();
  }, [mesSelecionado, salaoId]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [ano, mes] = mesSelecionado.split('-');
      const inicioMes = `${ano}-${mes}-01`;
      const fimMes = new Date(ano, mes, 0).toISOString().split('T')[0];

      const [paralelosRes, profsRes] = await Promise.all([
        supabase.from('procedimentos_paralelos')
          .select('*, profissionais(nome)')
          .eq('salao_id', salaoId)
          .gte('data', inicioMes)
          .lte('data', fimMes)
          .order('data', { ascending: false }),
        supabase.from('profissionais').select('*').eq('salao_id', salaoId).eq('ativo', true)
      ]);

      setParalelos(paralelosRes.data || []);
      setProfissionais(profsRes.data || []);
    } catch (error) {
      showToast('Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = (paralelo = null) => {
    if (paralelo) {
      setParaleloEditando(paralelo);
      setForm({
        data: paralelo.data,
        cliente: paralelo.cliente,
        descricao: paralelo.descricao,
        profissional_id: paralelo.profissional_id || '',
        valor: paralelo.valor,
        valor_pago: paralelo.valor_pago,
        valor_profissional: paralelo.valor_profissional
      });
    } else {
      setParaleloEditando(null);
      setForm({
        data: new Date().toISOString().split('T')[0],
        cliente: '',
        descricao: '',
        profissional_id: '',
        valor: '',
        valor_pago: '',
        valor_profissional: ''
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
        descricao: form.descricao,
        profissional_id: form.profissional_id || null,
        valor: Number(form.valor),
        valor_pago: Number(form.valor_pago),
        valor_profissional: Number(form.valor_profissional)
      };

      if (paraleloEditando) {
        await supabase.from('procedimentos_paralelos').update(dados).eq('id', paraleloEditando.id);
        showToast('Atualizado', 'success');
      } else {
        await supabase.from('procedimentos_paralelos').insert(dados);
        showToast('Criado', 'success');
      }
      setModalAberto(false);
      carregarDados();
    } catch (error) {
      showToast('Erro ao salvar', 'error');
    }
  };

  const deletar = async (id) => {
    if (!confirm('Deletar este registro?')) return;
    try {
      await supabase.from('procedimentos_paralelos').delete().eq('id', id);
      showToast('Deletado', 'success');
      carregarDados();
    } catch (error) {
      showToast('Erro ao deletar', 'error');
    }
  };

  const totalFaturado = paralelos.reduce((acc, p) => acc + Number(p.valor || 0), 0);
  const totalRecebido = paralelos.reduce((acc, p) => acc + Number(p.valor_pago || 0), 0);
  const totalPendente = paralelos.reduce((acc, p) => acc + Number(p.valor_pendente || 0), 0);
  const totalComissoes = paralelos.reduce((acc, p) => acc + Number(p.valor_profissional || 0), 0);

  if (loading) return <div className="p-10 text-center">Carregando...</div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <PageHeader 
        title="Paralelos" 
        subtitle="Serviços realizados fora da agenda principal"
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
              <Plus size={18} /> Novo Paralelo
            </button>
          </div>
        }
      />

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Total Faturado</p>
          <p className="text-2xl font-bold text-slate-900">{fmt(totalFaturado)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Total Recebido</p>
          <p className="text-2xl font-bold text-emerald-600">{fmt(totalRecebido)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">A Receber</p>
          <p className="text-2xl font-bold text-amber-600">{fmt(totalPendente)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Total Comissões</p>
          <p className="text-2xl font-bold text-blue-600">{fmt(totalComissoes)}</p>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Data</th>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Cliente</th>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Descrição</th>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Profissional</th>
              <th className="text-right px-4 py-3 font-medium text-slate-700">Valor</th>
              <th className="text-right px-4 py-3 font-medium text-slate-700">Pago</th>
              <th className="text-right px-4 py-3 font-medium text-slate-700">Comissão</th>
              <th className="text-right px-4 py-3 font-medium text-slate-700">Pendente</th>
              <th className="text-center px-4 py-3 font-medium text-slate-700">Ações</th>
            </tr>
          </thead>
          <tbody>
            {paralelos.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-8 text-slate-400">Nenhum registro neste mês</td>
              </tr>
            ) : (
              paralelos.map(par => (
                <tr key={par.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">{fmtData(par.data)}</td>
                  <td className="px-4 py-3 font-medium">{par.cliente}</td>
                  <td className="px-4 py-3">{par.descricao}</td>
                  <td className="px-4 py-3 text-slate-600">{par.profissionais?.nome || '-'}</td>
                  <td className="px-4 py-3 text-right">{fmt(par.valor)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{fmt(par.valor_pago)}</td>
                  <td className="px-4 py-3 text-right text-blue-600">{fmt(par.valor_profissional)}</td>
                  <td className="px-4 py-3 text-right text-amber-600">{fmt(par.valor_pendente)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => abrirModal(par)} className="text-blue-500 hover:text-blue-700">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => deletar(par.id)} className="text-red-500 hover:text-red-700">
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
      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={paraleloEditando ? 'Editar Paralelo' : 'Novo Paralelo'}>
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
              onChange={e => setForm({ ...form, cliente: e.target.value })}
              placeholder="Nome do cliente"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição do Serviço</label>
            <input
              type="text"
              value={form.descricao}
              onChange={e => setForm({ ...form, descricao: e.target.value })}
              placeholder="Ex: Unhas em gel"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Profissional (opcional)</label>
            <select
              value={form.profissional_id}
              onChange={e => setForm({ ...form, profissional_id: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Nenhum</option>
              {profissionais.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor Cobrado (R$)</label>
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Comissão Prof. (R$)</label>
              <input
                type="number"
                step="0.01"
                value={form.valor_profissional}
                onChange={e => setForm({ ...form, valor_profissional: e.target.value })}
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
