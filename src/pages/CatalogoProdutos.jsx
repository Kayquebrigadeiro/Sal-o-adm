import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { Plus, Trash2, Pencil, Package, Calculator } from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function CatalogoProdutos({ salaoId, onChange }) {
  const { showToast } = useToast();
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal de produto
  const [modalProd, setModalProd] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nome: '', preco_compra: '', qtd_aplicacoes: '' });
  const [confirmacao, setConfirmacao] = useState(null);

  useEffect(() => {
    if (salaoId) carregar();
  }, [salaoId]);

  const carregar = async () => {
    setLoading(true);
    const { data } = await supabase.from('produtos_catalogo').select('id, nome, preco_compra, qtd_aplicacoes, custo_por_uso, ativo').eq('salao_id', salaoId).eq('ativo', true).order('nome');
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
    if (!form.nome) return showToast('NOME É OBRIGATÓRIO', 'error');
    const dados = {
      salao_id: salaoId,
      nome: form.nome.toUpperCase(),
      preco_compra: Number(String(form.preco_compra).replace(',', '.')) || 0,
      qtd_aplicacoes: Number(String(form.qtd_aplicacoes).replace(',', '.')) || 1,
      ativo: true
    };
    let error;
    if (editando) {
      ({ error } = await supabase.from('produtos_catalogo').update(dados).eq('id', editando.id).eq('salao_id', salaoId));
    } else {
      ({ error } = await supabase.from('produtos_catalogo').upsert([dados], { onConflict: 'salao_id,nome' }));
    }
    if (error) showToast('ERRO: ' + error.message, 'error');
    else {
      showToast('PRODUTO SALVO!', 'success');
      setModalProd(false);
      await carregar();
      if (onChange) onChange();
    }
  };

  const deletarProduto = async (id) => {
    await supabase.from('produtos_catalogo').update({ ativo: false }).eq('id', id).eq('salao_id', salaoId);
    showToast('PRODUTO REMOVIDO', 'success');
    await carregar();
    if (onChange) onChange();
  };

  // Preview no modal
  const precoVal = Number(String(form.preco_compra).replace(',', '.')) || 0;
  const qtdVal = Number(String(form.qtd_aplicacoes).replace(',', '.')) || 1;
  const custoPorUsoPreview = precoVal / Math.max(qtdVal, 1);

  if (loading) return <div className="p-10 text-center text-gray-500 animate-pulse uppercase">CARREGANDO PRODUTOS...</div>;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-black text-gray-800 uppercase">Catálogo de Produtos</h2>
          <p className="text-sm text-gray-500 uppercase">Custo por aplicação calculado automaticamente</p>
        </div>
        <button onClick={() => abrirModalProduto()}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-600 text-white rounded-xl hover:from-blue-700 hover:to-blue-700 transition-all shadow-lg shadow-sky-200 font-bold text-sm uppercase">
          <Plus size={18} /> NOVO PRODUTO
        </button>
      </div>

      {/* ═══ TABELA DE PRODUTOS ═══ */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-10">
        <table className="w-full text-sm">
          <thead className="bg-white text-gray-800 text-[10px] uppercase tracking-wider">
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
              <tr><td colSpan={5} className="text-center py-10 text-gray-500 uppercase">NENHUM PRODUTO CADASTRADO</td></tr>
            ) : produtos.map(prod => {
              const fallbackCusto = (Number(prod.preco_compra) || 0) / Math.max(Number(prod.qtd_aplicacoes) || 1, 1);
              const custoExibido = prod.custo_por_uso || fallbackCusto;
              return (
                <tr key={prod.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors uppercase">
                  <td className="px-4 py-3 font-bold text-gray-800 flex items-center gap-2">
                    <Package size={14} className="text-gray-500" />
                    {prod.nome}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">{fmt(prod.preco_compra)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-sky-50 text-gray-500 px-2 py-0.5 rounded-full text-xs font-bold">{prod.qtd_aplicacoes}x</span>
                  </td>
                  <td className="px-4 py-3 text-right font-black text-sky-600">{fmt(custoExibido)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => abrirModalProduto(prod)} className="text-gray-500 hover:text-sky-600"><Pencil size={14} /></button>
                      <button
                        onClick={() => setConfirmacao({
                          title: 'REMOVER PRODUTO',
                          message: 'REMOVER ESTE PRODUTO?',
                          confirmLabel: 'REMOVER',
                          tone: 'danger',
                          onConfirm: async () => {
                            setConfirmacao(null);
                            await deletarProduto(prod.id);
                          },
                        })}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ═══ MODAL: PRODUTO ═══ */}
      <Modal open={modalProd} onClose={() => setModalProd(false)} title={editando ? 'EDITAR PRODUTO' : 'NOVO PRODUTO'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1 uppercase">Nome do Produto</label>
            <input type="text" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-500 uppercase font-bold"
              value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="EX: BOTOX CAPILAR 500ML" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1 uppercase">Valor do Frasco (R$)</label>
              <input type="number" step="0.01" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                value={form.preco_compra} onChange={e => setForm({ ...form, preco_compra: e.target.value })} placeholder="190.00" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1 uppercase">Qtd Aplicações</label>
              <input type="number" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                value={form.qtd_aplicacoes} onChange={e => setForm({ ...form, qtd_aplicacoes: e.target.value })} placeholder="12" />
            </div>
          </div>

          {/* Preview automático */}
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-center">
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Custo por Aplicação (Automático)</p>
            <p className="text-3xl font-black text-sky-600">{fmt(custoPorUsoPreview)}</p>
            <p className="text-[10px] text-gray-500 mt-1 uppercase">
              R$ {precoVal.toFixed(2)} ÷ {qtdVal} aplicações = R$ {custoPorUsoPreview.toFixed(2)}
            </p>
          </div>

          <button onClick={salvarProduto}
            className="w-full bg-sky-500 text-white py-3 rounded-xl font-bold hover:bg-sky-500 transition-all shadow-lg shadow-sky-200 uppercase">
            {editando ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR PRODUTO'}
          </button>
        </div>
      </Modal>

      <ConfirmModal
        open={!!confirmacao}
        title={confirmacao?.title || ''}
        message={confirmacao?.message || ''}
        confirmLabel={confirmacao?.confirmLabel || 'CONFIRMAR'}
        tone={confirmacao?.tone || 'danger'}
        onCancel={() => setConfirmacao(null)}
        onConfirm={confirmacao?.onConfirm || (() => setConfirmacao(null))}
      />
    </div>
  );
}
