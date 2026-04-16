import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import { FinancialEngine } from '../services/FinancialEngine';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import { Plus, Trash2, Pencil, Package, Layers, Link2, Unlink, AlertTriangle, Calculator } from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function CatalogoProdutos({ salaoId }) {
  const { showToast } = useToast();
  const [produtos, setProdutos] = useState([]);
  const [procedimentos, setProcedimentos] = useState([]);
  const [composicoes, setComposicoes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal de produto
  const [modalProd, setModalProd] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nome: '', preco_compra: '', qtd_aplicacoes: '' });

  // Modal de composição (vincular produtos ao procedimento)
  const [modalComp, setModalComp] = useState(false);
  const [procSelecionado, setProcSelecionado] = useState(null);
  const [prodsSelecionados, setProdsSelecionados] = useState([]);

  useEffect(() => {
    if (salaoId) carregar();
  }, [salaoId]);

  const carregar = async () => {
    setLoading(true);
    const [prodRes, procRes, compRes] = await Promise.all([
      supabase.from('produtos_catalogo').select('*').eq('salao_id', salaoId).eq('ativo', true).order('nome'),
      supabase.from('procedimentos').select('id, nome, custo_variavel, categoria').eq('salao_id', salaoId).eq('ativo', true).order('nome'),
      supabase.from('procedimento_produtos').select('*, produtos_catalogo(nome, custo_por_uso)').eq('salao_id', salaoId),
    ]);
    setProdutos(prodRes.data || []);
    setProcedimentos(procRes.data || []);
    setComposicoes(compRes.data || []);
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

  // ─── Composição (vincular produtos a procedimento) ───
  const abrirComposicao = (proc) => {
    setProcSelecionado(proc);
    const jaVinculados = composicoes
      .filter(c => c.procedimento_id === proc.id)
      .map(c => ({ produto_id: c.produto_id, qtd_por_uso: Number(c.qtd_por_uso) || 1 }));
    setProdsSelecionados(jaVinculados.length > 0 ? jaVinculados : []);
    setModalComp(true);
  };

  const addProdutoComposicao = () => {
    setProdsSelecionados(prev => [...prev, { produto_id: '', qtd_por_uso: 1 }]);
  };

  const removerProdutoComposicao = (idx) => {
    setProdsSelecionados(prev => prev.filter((_, i) => i !== idx));
  };

  const salvarComposicao = async () => {
    if (!procSelecionado) return;
    // Deletar links antigos
    await supabase.from('procedimento_produtos').delete().eq('procedimento_id', procSelecionado.id);
    // Inserir novos
    const novos = prodsSelecionados
      .filter(p => p.produto_id)
      .map(p => ({
        salao_id: salaoId,
        procedimento_id: procSelecionado.id,
        produto_id: p.produto_id,
        qtd_por_uso: Number(p.qtd_por_uso) || 1,
      }));
    if (novos.length > 0) {
      const { error } = await supabase.from('procedimento_produtos').insert(novos);
      if (error) { showToast('Erro: ' + error.message, 'error'); return; }
    }
    // Calcular custo total da composição e atualizar o procedimento
    const custoTotal = novos.reduce((acc, n) => {
      const prod = produtos.find(p => p.id === n.produto_id);
      return acc + (prod ? Number(prod.custo_por_uso) * n.qtd_por_uso : 0);
    }, 0);
    await supabase.from('procedimentos').update({ custo_variavel: Math.round(custoTotal * 100) / 100 }).eq('id', procSelecionado.id);

    showToast('Composição salva! Custo atualizado automaticamente.', 'success');
    setModalComp(false);
    carregar();
  };

  // Calcular custo composto de um procedimento
  const getCustoComposto = (procId) => {
    const links = composicoes.filter(c => c.procedimento_id === procId);
    if (links.length === 0) return null;
    return links.reduce((acc, c) => acc + (Number(c.produtos_catalogo?.custo_por_uso) || 0) * Number(c.qtd_por_uso || 1), 0);
  };

  // Preview no modal
  const custoPorUsoPreview = (Number(form.preco_compra) || 0) / Math.max(Number(form.qtd_aplicacoes) || 1, 1);

  if (loading) return <div className="p-10 text-center text-slate-400 animate-pulse">Carregando catálogo...</div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <PageHeader
        title="Catálogo de Produtos"
        subtitle="Custo por aplicação calculado automaticamente"
        action={
          <button onClick={() => abrirModalProduto()}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-violet-200 font-bold text-sm">
            <Plus size={18} /> Novo Produto
          </button>
        }
      />

      {/* ═══ TABELA DE PRODUTOS ═══ */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-10">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-white text-[10px] uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Produto</th>
              <th className="text-right px-4 py-3">Preço Compra</th>
              <th className="text-center px-4 py-3">Aplicações</th>
              <th className="text-right px-4 py-3">
                <span className="flex items-center justify-end gap-1"><Calculator size={12} /> Custo/Uso</span>
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

      {/* ═══ COMPOSIÇÃO POR PROCEDIMENTO ═══ */}
      <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
        <Layers size={20} className="text-indigo-500" /> Composição de Custos por Serviço
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        Vincule produtos a procedimentos como LUZES, COLORAÇÃO, etc. O custo é calculado automaticamente.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {procedimentos.map(proc => {
          const custoComp = getCustoComposto(proc.id);
          const qtdProdutos = composicoes.filter(c => c.procedimento_id === proc.id).length;
          return (
            <div key={proc.id}
              onClick={() => abrirComposicao(proc)}
              className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 cursor-pointer transition-all group shadow-sm hover:shadow-md">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-800 text-sm">{proc.nome}</h3>
                {qtdProdutos > 0 ? (
                  <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Link2 size={10} /> {qtdProdutos} produto{qtdProdutos > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Unlink size={10} /> Sem composição
                  </span>
                )}
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Custo atual: <b className="text-slate-700">{fmt(proc.custo_variavel)}</b></span>
                {custoComp !== null && (
                  <span className="text-indigo-500 font-bold">Composto: {fmt(custoComp)}</span>
                )}
              </div>
            </div>
          );
        })}
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
              <label className="block text-sm font-bold text-slate-700 mb-1">Preço de Compra (R$)</label>
              <input type="number" step="0.01" className="w-full border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.preco_compra} onChange={e => setForm({...form, preco_compra: e.target.value})} placeholder="190.00" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Quantas Aplicações Rende</label>
              <input type="number" className="w-full border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.qtd_aplicacoes} onChange={e => setForm({...form, qtd_aplicacoes: e.target.value})} placeholder="12" />
            </div>
          </div>

          {/* Preview automático */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
            <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">Custo por Aplicação (Automático)</p>
            <p className="text-3xl font-black text-indigo-600">{fmt(custoPorUsoPreview)}</p>
            <p className="text-[10px] text-indigo-400 mt-1">
              {fmt(form.preco_compra)} ÷ {form.qtd_aplicacoes || 1} aplicações
            </p>
          </div>

          <button onClick={salvarProduto}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
            {editando ? 'Salvar Alterações' : 'Cadastrar Produto'}
          </button>
        </div>
      </Modal>

      {/* ═══ MODAL: COMPOSIÇÃO ═══ */}
      <Modal open={modalComp} onClose={() => setModalComp(false)}
        title={`Composição: ${procSelecionado?.nome || ''}`}>
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Vincule os produtos usados neste procedimento. O custo será calculado automaticamente.
          </p>

          {prodsSelecionados.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl">
              <select className="flex-1 border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                value={item.produto_id}
                onChange={e => {
                  const arr = [...prodsSelecionados];
                  arr[idx].produto_id = e.target.value;
                  setProdsSelecionados(arr);
                }}>
                <option value="">Selecione...</option>
                {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} ({fmt(p.custo_por_uso)}/uso)</option>)}
              </select>
              <div className="w-20">
                <input type="number" step="0.1" min="0.1" className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-indigo-500"
                  value={item.qtd_por_uso}
                  onChange={e => {
                    const arr = [...prodsSelecionados];
                    arr[idx].qtd_por_uso = e.target.value;
                    setProdsSelecionados(arr);
                  }}
                  placeholder="Qtd"
                />
              </div>
              <button onClick={() => removerProdutoComposicao(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
            </div>
          ))}

          <button onClick={addProdutoComposicao}
            className="w-full py-2 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-500 font-bold text-sm hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1">
            <Plus size={14} /> Adicionar Produto
          </button>

          {/* Preview do custo total */}
          {prodsSelecionados.length > 0 && (() => {
            const total = prodsSelecionados.reduce((acc, item) => {
              const prod = produtos.find(p => p.id === item.produto_id);
              return acc + (prod ? Number(prod.custo_por_uso) * Number(item.qtd_por_uso || 1) : 0);
            }, 0);
            return (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Custo Total da Composição</p>
                <p className="text-2xl font-black text-emerald-600">{fmt(total)}</p>
                <p className="text-[10px] text-emerald-400 mt-1">Este valor será salvo como custo variável do procedimento</p>
              </div>
            );
          })()}

          <button onClick={salvarComposicao}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200">
            Salvar Composição
          </button>
        </div>
      </Modal>
    </div>
  );
}
