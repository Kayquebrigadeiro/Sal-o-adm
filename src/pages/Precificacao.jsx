import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

const Precificacao = () => {
  const [configs, setConfigs] = useState({
    custo_fixo_atendimento: 29.00,
    taxa_maquininha: 5.0,
    margem_alvo: 20.0
  });

  const [procedimentos, setProcedimentos] = useState([
    { id: 1, nome: 'Progressiva', comissao: 30, custo_p: 20, custo_m: 35, custo_g: 50, preco_p: 150, preco_m: 220, preco_g: 300 },
    { id: 2, nome: 'Mechas',      comissao: 40, custo_p: 45, custo_m: 70, custo_g: 100, preco_p: 350, preco_m: 500, preco_g: 750 },
  ]);

  const calcularLinha = (item, tamanho) => {
    const faturamento  = Number(item[`preco_${tamanho}`] || 0);
    const custoMaterial = Number(item[`custo_${tamanho}`] || 0);
    const comissaoVal  = faturamento * (Number(item.comissao || 0) / 100);
    const taxaVal      = faturamento * (configs.taxa_maquininha / 100);
    const custoFixo    = Number(configs.custo_fixo_atendimento);

    const lucro  = faturamento - custoMaterial - comissaoVal - taxaVal - custoFixo;
    const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0;
    return { lucro, margem };
  };

  const handleUpdate = (id, campo, valor) => {
    setProcedimentos(prev => prev.map(p =>
      p.id === id ? { ...p, [campo]: valor } : p
    ));
  };

  const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <h1 className="text-2xl font-bold mb-6 text-slate-800">Precificação Estratégica</h1>

      {/* CONFIGURAÇÕES GLOBAIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-lg">
          <label className="block text-xs uppercase opacity-70 mb-1">Custo Fixo / Atendimento</label>
          <div className="flex items-center">
            <span className="mr-2">R$</span>
            <input type="number" className="bg-transparent border-b border-slate-700 w-full outline-none focus:border-emerald-400 text-xl font-bold"
              value={configs.custo_fixo_atendimento}
              onChange={(e) => setConfigs({...configs, custo_fixo_atendimento: e.target.value})} />
          </div>
        </div>
        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-lg">
          <label className="block text-xs uppercase opacity-70 mb-1">Taxa Maquininha (%)</label>
          <input type="number" className="bg-transparent border-b border-slate-700 w-full outline-none focus:border-emerald-400 text-xl font-bold"
            value={configs.taxa_maquininha}
            onChange={(e) => setConfigs({...configs, taxa_maquininha: e.target.value})} />
        </div>
        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-lg">
          <label className="block text-xs uppercase opacity-70 mb-1">Margem Alvo (%)</label>
          <input type="number" className="bg-transparent border-b border-slate-700 w-full outline-none focus:border-emerald-400 text-xl font-bold"
            value={configs.margem_alvo}
            onChange={(e) => setConfigs({...configs, margem_alvo: e.target.value})} />
        </div>
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            {/* Linha de grupos */}
            <tr className="bg-slate-900 text-white text-xs uppercase font-bold">
              <th className="p-3" rowSpan={2}>Serviço</th>
              <th className="p-3 text-center" rowSpan={2}>Comissão %</th>
              <th className="p-3 text-center border-l border-slate-700" colSpan={3}>Cabelo P</th>
              <th className="p-3 text-center border-l border-slate-700" colSpan={3}>Cabelo M</th>
              <th className="p-3 text-center border-l border-slate-700" colSpan={3}>Cabelo G</th>
              <th className="p-3 text-center" rowSpan={2}>Ações</th>
            </tr>
            <tr className="bg-slate-800 text-slate-300 text-xs uppercase font-bold">
              <th className="p-2 text-center border-l border-slate-700">Custo</th>
              <th className="p-2 text-center">Preço</th>
              <th className="p-2 text-right text-emerald-400">Lucro</th>
              <th className="p-2 text-center border-l border-slate-700">Custo</th>
              <th className="p-2 text-center">Preço</th>
              <th className="p-2 text-right text-emerald-400">Lucro</th>
              <th className="p-2 text-center border-l border-slate-700">Custo</th>
              <th className="p-2 text-center">Preço</th>
              <th className="p-2 text-right text-emerald-400">Lucro</th>
            </tr>
          </thead>
          <tbody>
            {procedimentos.map(item => {
              const p = calcularLinha(item, 'p');
              const m = calcularLinha(item, 'm');
              const g = calcularLinha(item, 'g');
              return (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  {/* Nome */}
                  <td className="p-2">
                    <input className="w-full bg-transparent border-none focus:ring-1 focus:ring-emerald-500 rounded p-1 font-medium"
                      value={item.nome} onChange={(e) => handleUpdate(item.id, 'nome', e.target.value)} />
                  </td>
                  {/* Comissão */}
                  <td className="p-2">
                    <input type="number" className="w-16 bg-transparent border-none text-center focus:ring-1 focus:ring-emerald-500 rounded p-1"
                      value={item.comissao} onChange={(e) => handleUpdate(item.id, 'comissao', e.target.value)} />
                  </td>
                  {/* P */}
                  <td className="p-2 border-l border-slate-100">
                    <input type="number" className="w-16 bg-transparent border-none text-center focus:ring-1 focus:ring-emerald-500 rounded p-1"
                      value={item.custo_p} onChange={(e) => handleUpdate(item.id, 'custo_p', e.target.value)} />
                  </td>
                  <td className="p-2">
                    <input type="number" className="w-16 bg-transparent border-none text-center font-bold focus:ring-1 focus:ring-emerald-500 rounded p-1"
                      value={item.preco_p} onChange={(e) => handleUpdate(item.id, 'preco_p', e.target.value)} />
                  </td>
                  <td className={`p-2 text-right font-black ${p.lucro < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {fmt(p.lucro)}
                  </td>
                  {/* M */}
                  <td className="p-2 border-l border-slate-100">
                    <input type="number" className="w-16 bg-transparent border-none text-center focus:ring-1 focus:ring-emerald-500 rounded p-1"
                      value={item.custo_m} onChange={(e) => handleUpdate(item.id, 'custo_m', e.target.value)} />
                  </td>
                  <td className="p-2">
                    <input type="number" className="w-16 bg-transparent border-none text-center font-bold focus:ring-1 focus:ring-emerald-500 rounded p-1"
                      value={item.preco_m} onChange={(e) => handleUpdate(item.id, 'preco_m', e.target.value)} />
                  </td>
                  <td className={`p-2 text-right font-black ${m.lucro < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {fmt(m.lucro)}
                  </td>
                  {/* G */}
                  <td className="p-2 border-l border-slate-100">
                    <input type="number" className="w-16 bg-transparent border-none text-center focus:ring-1 focus:ring-emerald-500 rounded p-1"
                      value={item.custo_g} onChange={(e) => handleUpdate(item.id, 'custo_g', e.target.value)} />
                  </td>
                  <td className="p-2">
                    <input type="number" className="w-16 bg-transparent border-none text-center font-bold focus:ring-1 focus:ring-emerald-500 rounded p-1"
                      value={item.preco_g} onChange={(e) => handleUpdate(item.id, 'preco_g', e.target.value)} />
                  </td>
                  <td className={`p-2 text-right font-black ${g.lucro < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {fmt(g.lucro)}
                  </td>
                  {/* Ações */}
                  <td className="p-2 text-center text-slate-400">
                    <button className="hover:text-red-500"><Trash2 size={16} /></button>
                  </td>
                </tr>
              );
            })}
            <tr className="bg-emerald-50/50">
              <td className="p-2" colSpan={12}>
                <button className="flex items-center text-emerald-600 font-bold text-xs p-2 hover:underline">
                  <Plus size={14} className="mr-1" /> ADICIONAR NOVO SERVIÇO
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Precificacao;
