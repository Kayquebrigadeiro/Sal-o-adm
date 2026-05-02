import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from './Toast';
import { Plus, Trash2, Loader2, Package } from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ProdutosRelacionados({ salaoId, servicoId, onUpdate }) {
  const { showToast } = useToast();
  const [vinculos, setVinculos] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Form de novo vínculo
  const [novoProdutoId, setNovoProdutoId] = useState('');
  const [novaQtd, setNovaQtd] = useState(1);

  useEffect(() => {
    if (servicoId) carregar();
  }, [servicoId]);

  const carregar = async () => {
    setLoading(true);
    try {
      // Dispara as buscas de Catálogo e Vínculos AO MESMO TEMPO (Paralelo)
      const [catRes, vincRes] = await Promise.all([
        supabase.from('produtos_catalogo').select('id, nome, preco_compra, qtd_aplicacoes, custo_por_uso').eq('salao_id', salaoId).eq('ativo', true).order('nome'),
        supabase.from('procedimento_produtos').select('procedimento_id, produto_id, qtd_usada').eq('procedimento_id', servicoId)
      ]);

      if (catRes.error) throw catRes.error;
      if (vincRes.error) throw vincRes.error;

      setCatalogo(catRes.data || []);
      setVinculos(vincRes.data || []);
    } catch (err) {
      console.error(err);
      showToast('ERRO AO CARREGAR PRODUTOS RELACIONADOS', 'error');
    } finally {
      setLoading(false);
    }
  };

  const adicionar = async () => {
    if (!novoProdutoId) return showToast('SELECIONE UM PRODUTO', 'error');
    setSalvando(true);
    try {
      const { error } = await supabase.from('procedimento_produtos').insert([{
        salao_id: salaoId,
        procedimento_id: servicoId,
        produto_id: novoProdutoId,
        qtd_usada: Number(novaQtd) || 1
      }]);

      if (error) throw error;

      showToast('PRODUTO VINCULADO COM SUCESSO!', 'success');
      setNovoProdutoId('');
      setNovaQtd(1);

      await carregar();
      if (onUpdate) onUpdate(); // Atualiza a tabela principal
    } catch (err) {
      showToast('ERRO AO VINCULAR PRODUTO', 'error');
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (produtoId) => {
    if (!window.confirm('REMOVER ESTE PRODUTO DO SERVIÇO?')) return;
    try {
      const { error } = await supabase.from('procedimento_produtos').delete().eq('procedimento_id', servicoId).eq('produto_id', produtoId).eq('salao_id', salaoId);
      if (error) throw error;

      showToast('REMOVIDO COM SUCESSO!', 'success');
      await carregar();
      if (onUpdate) onUpdate(); // Atualiza a tabela principal
    } catch (err) {
      showToast('ERRO AO REMOVER', 'error');
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-xs font-bold text-indigo-400 uppercase animate-pulse">CARREGANDO PRODUTOS...</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-indigo-100 p-5 shadow-inner">
      <h4 className="text-xs font-black text-indigo-800 uppercase mb-4 flex items-center gap-2">
        <Package size={14} className="text-indigo-500" />
        Composição do Custo de Material
      </h4>

      {/* Lista de produtos já vinculados */}
      {vinculos.length === 0 ? (
        <div className="text-center py-5 bg-slate-50 rounded-xl border border-dashed border-slate-200 mb-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase">NENHUM PRODUTO VINCULADO A ESTE SERVIÇO</p>
        </div>
      ) : (
        <div className="space-y-2 mb-5">
          {vinculos.map(v => {
            // Localiza o produto no catálogo usando o ID para mostrar os nomes sem depender do banco
            const p = catalogo.find(c => c.id === v.produto_id);
            if (!p) return null;

            // Fallback caso a coluna custo_por_uso falhe
            const fallbackMatematica = (Number(p.preco_compra) || 0) / Math.max(Number(p.qtd_aplicacoes) || 1, 1);
            const custoUnitario = Number(p.custo_por_uso) || fallbackMatematica;
            const custoTotal = custoUnitario * Number(v.qtd_usada);

            return (
              <div key={v.produto_id} className="flex items-center justify-between bg-indigo-50/50 border border-indigo-100 p-3 rounded-xl transition-all hover:bg-indigo-50">
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-700 uppercase">{p.nome}</p>
                  <p className="text-[10px] text-slate-500 uppercase">{fmt(custoUnitario)} POR DOSE</p>
                </div>
                <div className="flex items-center gap-5">
                  <div className="text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Qtd Usada</p>
                    <p className="text-xs font-black text-indigo-600">{v.qtd_usada}x</p>
                  </div>
                  <div className="text-right w-20">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Custo</p>
                    <p className="text-xs font-black text-red-500">{fmt(custoTotal)}</p>
                  </div>
                  <button onClick={() => remover(v.produto_id)} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors" title="REMOVER PRODUTO">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Adicionar novo vínculo */}
      <div className="flex items-end gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex-1">
          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Vincular Novo Produto</label>
          <select
            className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 uppercase outline-none focus:border-indigo-500 bg-white"
            value={novoProdutoId}
            onChange={e => setNovoProdutoId(e.target.value)}
          >
            <option value="">SELECIONE UM PRODUTO DO CATÁLOGO...</option>
            {catalogo.map(c => {
              const fb = (Number(c.preco_compra) || 0) / Math.max(Number(c.qtd_aplicacoes) || 1, 1);
              return (
                <option key={c.id} value={c.id}>
                  {c.nome} ({fmt(c.custo_por_uso || fb)} / DOSE)
                </option>
              );
            })}
          </select>
        </div>
        <div className="w-24">
          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Doses Usadas</label>
          <input
            type="number" min="0.1" step="0.1"
            className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-center outline-none focus:border-indigo-500 bg-white"
            value={novaQtd}
            onChange={e => setNovaQtd(e.target.value)}
          />
        </div>
        <button
          onClick={adicionar}
          disabled={salvando}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center disabled:opacity-50 h-[38px] uppercase text-xs shadow-md shadow-indigo-200"
        >
          {salvando ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} className="mr-1" /> Vincular</>}
        </button>
      </div>
    </div>
  );
}
