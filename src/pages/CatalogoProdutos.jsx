import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { Plus, Trash2, Pencil, Package, Calculator } from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function CatalogoProdutos({ salaoId }) {
  const { showToast } = useToast();
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal de produto
  const [modalProd, setModalProd] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nome: '', preco_compra: '', qtd_aplicacoes: '' });

  useEffect(() => {
    if (salaoId) carregar();
  }, [salaoId]);

  const carregar = async () => {
    setLoading(true);
    const { data } = await supabase.from('produtos_catalogo').select('*').eq('salao_id', salaoId).eq('ativo', true).order('nome');
    setProdutos(data || []);
    setLoading(false);
  };

  // ─── CRUD Produto ───
  const abrirModalProduto = (prod = null) => {
    if (prod) {
      setEditando(prod);
      setForm({ nome: prod.nome, preco_compra: prod.preco_compra, qtd_aplicacoes: prod.qtd_aplicacoes });
    } else {
      setEditando(null);
      setForm({ nome: '', preco_compra: '', qtd_aplicacoes: '' });
    }
    setModalProd(true);
  };

  const salvarProduto = async () => {
    if (!form.nome) return showToast('Nome é obrigatório', 'error');
    const dados = {
      salao_id: salaoId,
      nome: form.nome.toUpperCase(),
      preco_compra: Number(form.preco_compra) || 0,
      qtd_aplicacoes: Number(form.qtd_aplicacoes) || 1,
    };
    let error;
    if (editando) {
      ({ error } = await supabase.from('produtos_catalogo').update(dados).eq('id', editando.id));
    } else {
      ({ error } = await supabase.from('produtos_catalogo').insert(dados));
    }
    if (error) showToast('Erro: ' + error.message, 'error');
    else { showToast('Produto salvo!', 'success'); setModalProd(false); carregar(); }
  };

  const deletarProduto = async (id) => {
    if (!confirm('Remover este produto?')) return;
    await supabase.from('produtos_catalogo').update({ ativo: false }).eq('id', id);
    showToast('Produto removido', 'success');
    carregar();
  };

  // Preview no modal
  const custoPorUsoPreview = (Number(form.preco_compra) || 0) / Math.max(Number(form.qtd_aplicacoes) || 1, 1);

  if (loading) return <div className="p-10 text-center text-slate-400 animate-pulse">Carregando produtos...</div>;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-black text-slate-800">Catálogo de Produtos</h2>
          <p className="text-sm text-slate-500">Custo por aplicação calculado automaticamente</p>
        </div>
        <button onClick={() => abrirModalProduto()}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-violet-200 font-bold text-sm">
          <Plus size={18} /> Novo Produto
        </button>
      </div>

      {/* ═══ TABELA DE PRODUTOS ═══ */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-10">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-white text-[10px] uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Produto</th>
              <th className="text-right px-4 py-3">Valor / Frasco</th>
              <th className="text-center px-4 py-3">Aplicações</th>
              <th className="text-right px-4 py-3">
                <span className="flex items-center justify-end gap-1"><Calculator size={12} /> Custo / Aplic.</span>
              </th>
              <th className="text-center px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {produtos.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400">Nenhum produto cadastrado</td></tr>
            ) : produtos.map(prod => (
              <tr key={prod.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-bold text-slate-800 flex items-center gap-2">
                  <Package size={14} className="text-violet-400" />
                  {prod.nome}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">{fmt(prod.preco_compra)}</td>
                <td className="px-4 py-3 text-center">
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{prod.qtd_aplicacoes}x</span>
                </td>
                <td className="px-4 py-3 text-right font-black text-indigo-600">{fmt(prod.custo_por_uso)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => abrirModalProduto(prod)} className="text-blue-500 hover:text-blue-700"><Pencil size={14} /></button>
                    <button onClick={() => deletarProduto(prod.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ═══ MODAL: PRODUTO ═══ */}
      <Modal open={modalProd} onClose={() => setModalProd(false)} title={editando ? 'Editar Produto' : 'Novo Produto'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Nome do Produto</label>
            <input type="text" className="w-full border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 uppercase font-bold"
              value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Ex: BOTOX CAPILAR 500ML" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Valor do Frasco (R$)</label>
              <input type="number" step="0.01" className="w-full border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.preco_compra} onChange={e => setForm({...form, preco_compra: e.target.value})} placeholder="190.00" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Qtd Aplicações</label>
              <input type="number" className="w-full border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.qtd_aplicacoes} onChange={e => setForm({...form, qtd_aplicacoes: e.target.value})} placeholder="12" />
            </div>
          </div>

          {/* Preview automático */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
            <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">Custo por Aplicação (Automático)</p>
            <p className="text-3xl font-black text-indigo-600">{fmt(custoPorUsoPreview)}</p>
            <p className="text-[10px] text-indigo-400 mt-1">
              R$ {form.preco_compra || 0} ÷ {form.qtd_aplicacoes || 1} aplicações = R$ {custoPorUsoPreview.toFixed(2)}
            </p>
          </div>

          <button onClick={salvarProduto}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
            {editando ? 'Salvar Alterações' : 'Cadastrar Produto'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
