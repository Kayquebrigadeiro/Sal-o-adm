import React, { useState } from 'react';
import { ShoppingBag, Plus, Trash2, ShoppingCart, X, Package } from 'lucide-react';

const HomeCare = () => {
  const [produtos, setProdutos] = useState([
    { id: 1, nome: 'Kit Shampoo + Condicionador Premium', custo: 80.00, preco_venda: 150.00, estoque: 12 },
    { id: 2, nome: 'Óleo Reparador de Pontas 50ml', custo: 35.00, preco_venda: 75.00, estoque: 5 },
    { id: 3, nome: 'Máscara de Hidratação Profunda', custo: 55.00, preco_venda: 110.00, estoque: 8 },
  ]);

  const [modalVenda, setModalVenda] = useState(false);
  const [novaVenda, setNovaVenda] = useState({ cliente: '', produtoId: '', quantidade: 1, valorCobrado: 0 });

  const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleUpdate = (id, campo, valor) => {
    setProdutos(prev => prev.map(p =>
      p.id === id ? { ...p, [campo]: valor } : p
    ));
  };

  const handleSelecionarProduto = (id) => {
    const prod = produtos.find(p => p.id === Number(id));
    if (prod) {
      setNovaVenda({ ...novaVenda, produtoId: id, valorCobrado: prod.preco_venda * novaVenda.quantidade });
    }
  };

  const handleQuantidade = (qtd) => {
    const prod = produtos.find(p => p.id === Number(novaVenda.produtoId));
    setNovaVenda({
      ...novaVenda,
      quantidade: qtd,
      valorCobrado: prod ? prod.preco_venda * qtd : 0
    });
  };

  const confirmarVenda = () => {
    if (!novaVenda.produtoId) return alert('Selecione um produto!');
    const prod = produtos.find(p => p.id === Number(novaVenda.produtoId));

    alert(`Venda registrada!\nCliente: ${novaVenda.cliente}\nProduto: ${prod.nome}\nLucro da Venda: ${fmt(novaVenda.valorCobrado - (prod.custo * novaVenda.quantidade))}`);

    setModalVenda(false);
    setNovaVenda({ cliente: '', produtoId: '', quantidade: 1, valorCobrado: 0 });
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">HomeCare & Estoque</h1>
          <p className="text-slate-500 text-sm">Gestão de produtos e vendas de prateleira.</p>
        </div>

        <button
          onClick={() => setModalVenda(true)}
          className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
        >
          <ShoppingCart size={20} /> Registrar Venda
        </button>
      </div>

      {/* TABELA DE ESTOQUE */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <th className="p-4 w-12 text-center"><Package size={14} className="inline"/></th>
              <th className="p-4">Produto</th>
              <th className="p-4 text-center">Qtd. Estoque</th>
              <th className="p-4 text-right">Custo (R$)</th>
              <th className="p-4 text-right">Preço Venda (R$)</th>
              <th className="p-4 text-right">Lucro Unitário</th>
              <th className="p-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {produtos.map(item => {
              const lucro = Number(item.preco_venda) - Number(item.custo);
              const margem = item.preco_venda > 0 ? (lucro / item.preco_venda) * 100 : 0;

              return (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 text-center text-slate-300 font-bold text-xs">{item.id}</td>
                  <td className="p-2">
                    <input
                      className="w-full bg-transparent border-none focus:ring-1 focus:ring-emerald-500 rounded p-2 text-sm font-bold text-slate-700"
                      value={item.nome}
                      onChange={(e) => handleUpdate(item.id, 'nome', e.target.value)}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      className="w-full bg-transparent border-none text-center focus:ring-1 focus:ring-emerald-500 rounded p-2 text-sm font-bold"
                      value={item.estoque}
                      onChange={(e) => handleUpdate(item.id, 'estoque', e.target.value)}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      className="w-full bg-transparent border-none text-right focus:ring-1 focus:ring-emerald-500 rounded p-2 text-sm"
                      value={item.custo}
                      onChange={(e) => handleUpdate(item.id, 'custo', e.target.value)}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      className="w-full bg-transparent border-none text-right font-black text-slate-800 focus:ring-1 focus:ring-emerald-500 rounded p-2 text-sm"
                      value={item.preco_venda}
                      onChange={(e) => handleUpdate(item.id, 'preco_venda', e.target.value)}
                    />
                  </td>
                  <td className="p-4 text-right">
                    <div className={`font-black ${lucro < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {fmt(lucro)}
                    </div>
                    <div className="text-[10px] text-blue-500 font-bold">{margem.toFixed(1)}% Margem</div>
                  </td>
                  <td className="p-4 text-center text-slate-300">
                    <button className="hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                  </td>
                </tr>
              );
            })}
            <tr className="bg-emerald-50/30">
              <td className="p-2" colSpan={7}>
                <button className="flex items-center text-emerald-600 font-black text-xs p-2 hover:underline tracking-tight">
                  <Plus size={14} className="mr-1" /> ADICIONAR NOVO PRODUTO AO ESTOQUE
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* MODAL PDV */}
      {modalVenda && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2"><ShoppingBag size={20}/> PDV Rápido</h2>
                <p className="text-xs text-slate-500 font-bold uppercase mt-1">Registrar saída de produto</p>
              </div>
              <button onClick={() => setModalVenda(false)} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Cliente (Opcional)</label>
                <input
                  type="text" placeholder="Ex: JULIANA SILVA"
                  className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-emerald-500 font-bold text-sm uppercase"
                  value={novaVenda.cliente} onChange={e => setNovaVenda({...novaVenda, cliente: e.target.value.toUpperCase()})}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Produto</label>
                <select
                  className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-emerald-500 font-bold text-sm bg-white"
                  value={novaVenda.produtoId} onChange={e => handleSelecionarProduto(e.target.value)}
                >
                  <option value="">Selecione o produto...</option>
                  {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} ({fmt(p.preco_venda)})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Quantidade</label>
                  <input
                    type="number" min="1"
                    className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-emerald-500 font-bold text-sm text-center"
                    value={novaVenda.quantidade} onChange={e => handleQuantidade(Number(e.target.value))}
                  />
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-right">
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Total a Cobrar</label>
                  <span className="text-xl font-black text-slate-900">{fmt(novaVenda.valorCobrado)}</span>
                </div>
              </div>

              <button
                onClick={confirmarVenda}
                className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black text-lg shadow-lg hover:bg-emerald-700 transition-all mt-4"
              >
                Concluir Venda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeCare;
