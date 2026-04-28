import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from './Toast';
import { Plus, Trash2, Link } from 'lucide-react';
import Modal from './Modal';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ProdutosRelacionados({ salaoId, servicoId, onUpdate }) {
  const { showToast } = useToast();
  const [relacionamentos, setRelacionamentos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [produtosCatalogo, setProdutosCatalogo] = useState([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState('');

  useEffect(() => {
    carregar();
  }, [servicoId]);

  const carregar = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('procedimento_produtos')
        .select(`
          id,
          procedimento_id,
          produto_id,
          qtd_usada,
          produtos_catalogo (
            id,
            nome,
            preco_compra,
            qtd_aplicacoes,
            custo_por_uso
          )
        `)
        .eq('procedimento_id', servicoId);

      if (error) throw error;
      setRelacionamentos(data || []);
    } catch (err) {
      showToast('Erro ao carregar produtos vinculados: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const carregarCatalogo = async () => {
    try {
      const { data, error } = await supabase
        .from('produtos_catalogo')
        .select('*')
        .eq('salao_id', salaoId)
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      setProdutosCatalogo(data || []);
    } catch (err) {
      showToast('Erro ao carregar catálogo: ' + err.message, 'error');
    }
  };

  const abrirModal = () => {
    carregarCatalogo();
    setProdutoSelecionado('');
    setModalOpen(true);
  };

  const vincularProduto = async () => {
    if (!produtoSelecionado) return showToast('Selecione um produto', 'error');
    
    if (relacionamentos.find(r => r.produto_id === produtoSelecionado)) {
      return showToast('Este produto já está vinculado!', 'error');
    }

    try {
      const { error } = await supabase.from('procedimento_produtos').insert([{
        procedimento_id: servicoId,
        produto_id: produtoSelecionado,
        qtd_usada: 1
      }]);
      if (error) throw error;
      
      showToast('Produto vinculado com sucesso', 'success');
      setModalOpen(false);
      await carregar();
      if (onUpdate) onUpdate();
    } catch (err) {
      showToast('Erro ao vincular produto: ' + err.message, 'error');
    }
  };

  const atualizarQtd = async (id, novaQtd) => {
    const qtd = Number(novaQtd) || 0;
    if (qtd < 0) return;
    
    setRelacionamentos(prev => prev.map(r => r.id === id ? { ...r, qtd_usada: qtd } : r));

    try {
      const { error } = await supabase
        .from('procedimento_produtos')
        .update({ qtd_usada: qtd })
        .eq('id', id);
      if (error) throw error;
      if (onUpdate) onUpdate();
    } catch (err) {
      showToast('Erro ao atualizar quantidade: ' + err.message, 'error');
      carregar();
    }
  };

  const removerVinculo = async (id) => {
    if (!window.confirm('Remover este produto do serviço?')) return;
    try {
      const { error } = await supabase.from('procedimento_produtos').delete().eq('id', id);
      if (error) throw error;
      showToast('Produto removido do serviço', 'success');
      await carregar();
      if (onUpdate) onUpdate();
    } catch (err) {
      showToast('Erro ao remover vínculo: ' + err.message, 'error');
    }
  };

  if (loading) return <div className="p-4 text-center text-slate-400 text-sm">Carregando produtos vinculados...</div>;

  return (
    <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Link size={14} className="text-indigo-500"/> Composição de Material
        </h4>
        <button onClick={abrirModal} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors">
          <Plus size={14} /> Vincular Produto
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider">
              <th className="pb-2 font-bold">Produto</th>
              <th className="pb-2 font-bold text-right">Valor/Frasco</th>
              <th className="pb-2 font-bold text-center">Aplicações</th>
              <th className="pb-2 font-bold text-right">Custo/Aplic</th>
              <th className="pb-2 font-bold text-center">Qtd Usada</th>
              <th className="pb-2 font-bold text-right">Total</th>
              <th className="pb-2 font-bold text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {relacionamentos.length === 0 ? (
              <tr><td colSpan={7} className="py-4 text-center text-slate-400">Nenhum produto vinculado.</td></tr>
            ) : relacionamentos.map(rel => {
              const prod = rel.produtos_catalogo;
              const custoAplic = Number(prod.preco_compra) / Math.max(Number(prod.qtd_aplicacoes), 1);
              const total = custoAplic * rel.qtd_usada;

              return (
                <tr key={rel.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="py-2 font-medium text-slate-700">{prod.nome}</td>
                  <td className="py-2 text-right text-slate-500">{fmt(prod.preco_compra)}</td>
                  <td className="py-2 text-center text-slate-500">{prod.qtd_aplicacoes}x</td>
                  <td className="py-2 text-right font-medium text-indigo-400">{fmt(custoAplic)}</td>
                  <td className="py-2 text-center">
                    <input type="number" step="0.1" value={rel.qtd_usada} onChange={(e) => atualizarQtd(rel.id, e.target.value)}
                      className="w-16 text-center border border-slate-200 rounded p-1 text-xs outline-none focus:border-indigo-500" />
                  </td>
                  <td className="py-2 text-right font-bold text-indigo-600">{fmt(total)}</td>
                  <td className="py-2 text-center">
                    <button onClick={() => removerVinculo(rel.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Vincular Produto ao Serviço">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">Selecione o Produto</label>
            <select value={produtoSelecionado} onChange={(e) => setProdutoSelecionado(e.target.value)}
              className="w-full border-2 border-slate-100 p-3 rounded-xl focus:border-indigo-500 outline-none bg-white">
              <option value="">-- Escolha um produto --</option>
              {produtosCatalogo.map(p => (
                <option key={p.id} value={p.id}>{p.nome} ({fmt(p.preco_compra)})</option>
              ))}
            </select>
          </div>
          <button onClick={vincularProduto} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all">
            Vincular
          </button>
        </div>
      </Modal>
    </div>
  );
}
