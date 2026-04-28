import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { FinancialEngine } from '../services/FinancialEngine';
import { TAXA_MAQUININHA_PADRAO } from '../services/financialConstants';
import CatalogoProdutos from './CatalogoProdutos';
import BaseCustos from '../components/BaseCustos';
import ProdutosRelacionados from '../components/ProdutosRelacionados';
import { CATEGORIAS, ORDEM_CATEGORIAS } from '../constants/categorias';
import { Plus, Trash2, Calculator, AlertTriangle, Package, Landmark, Zap } from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtPct = (v) => `${Number(v || 0).toFixed(1)}%`;

const TableRow = ({ proc, config, custoMaterial, isExpanded, onToggleExpand, salaoId, carregar, deletarProc }) => {
  const [ganho, setGanho] = useState(proc.ganho_liquido_desejado || '');
  const [precoP, setPrecoP] = useState(proc.preco_p || '');
  const [precoM, setPrecoM] = useState(proc.preco_m || '');
  const [precoG, setPrecoG] = useState(proc.preco_g || '');
  const { showToast } = useToast();

  // Update effect if external data changes
  useEffect(() => { setGanho(proc.ganho_liquido_desejado || ''); }, [proc.ganho_liquido_desejado]);
  useEffect(() => { setPrecoP(proc.preco_p || ''); }, [proc.preco_p]);
  useEffect(() => { setPrecoM(proc.preco_m || ''); }, [proc.preco_m]);
  useEffect(() => { setPrecoG(proc.preco_g || ''); }, [proc.preco_g]);

  const handleUpdate = async (field, value) => {
    try {
      const numValue = Number(value) || 0;
      await supabase.from('procedimentos').update({ [field]: numValue }).eq('id', proc.id).eq('salao_id', salaoId);
    } catch (err) {
      showToast('Erro ao salvar ' + field, 'error');
    }
  };

  const handleGanhoBlur = async () => {
    const numGanho = Number(ganho) || 0;
    if (numGanho !== Number(proc.ganho_liquido_desejado)) {
      await handleUpdate('ganho_liquido_desejado', numGanho);
      const engine = new FinancialEngine({ custoFixoPorAtendimento: config.custo_fixo_por_atendimento, taxaMaquininhaPct: config.taxa_maquininha_pct });
      const calc = engine.calcularPrecoPMG({
        custoFixo: config.custo_fixo_por_atendimento,
        custoMaterial: custoMaterial,
        ganhoLiquido: numGanho
      });

      if (!calc.erro) {
        setPrecoP(calc.precoP);
        await handleUpdate('preco_p', calc.precoP);

        if (proc.requer_comprimento) {
          if (!precoM) {
            setPrecoM(calc.precoM);
            await handleUpdate('preco_m', calc.precoM);
          }
          if (!precoG) {
            setPrecoG(calc.precoG);
            await handleUpdate('preco_g', calc.precoG);
          }
        }
        showToast('Preços calculados e salvos!', 'success');
        carregar();
      }
    }
  };

  return (
    <React.Fragment>
      <tr className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-indigo-50/50' : ''}`}>
        <td className="p-3 font-bold text-slate-800">
          {proc.nome}
        </td>
        <td className="p-3 text-center text-slate-500 font-medium">{fmt(config.custo_fixo_por_atendimento)}</td>
        <td className="p-3 text-center font-bold text-indigo-600">{fmt(custoMaterial)}</td>
        <td className="p-3 text-center">
          <input type="number" step="0.01" value={ganho} onChange={e => setGanho(e.target.value)} onBlur={handleGanhoBlur}
            className="w-20 text-center border border-emerald-200 rounded p-1 text-sm outline-none focus:border-emerald-500 font-bold text-emerald-700 bg-emerald-50" />
        </td>
        <td className="p-3 text-center border-l border-slate-100">
          <input type="number" step="0.01" value={precoP} onChange={e => setPrecoP(e.target.value)} onBlur={() => { handleUpdate('preco_p', precoP); carregar(); }}
            className="w-20 text-center border border-slate-200 rounded p-1 text-sm outline-none focus:border-slate-500 font-bold text-slate-800 bg-white" />
        </td>
        <td className="p-3 text-center">
          {proc.requer_comprimento ? (
            <input type="number" step="0.01" value={precoM} onChange={e => setPrecoM(e.target.value)} onBlur={() => { handleUpdate('preco_m', precoM); carregar(); }}
              className="w-20 text-center border border-slate-200 rounded p-1 text-sm outline-none focus:border-slate-500 font-bold text-slate-600 bg-white" />
          ) : '-'}
        </td>
        <td className="p-3 text-center">
          {proc.requer_comprimento ? (
            <input type="number" step="0.01" value={precoG} onChange={e => setPrecoG(e.target.value)} onBlur={() => { handleUpdate('preco_g', precoG); carregar(); }}
              className="w-20 text-center border border-slate-200 rounded p-1 text-sm outline-none focus:border-slate-500 font-bold text-slate-600 bg-white" />
          ) : '-'}
        </td>
        <td className="p-3 text-center border-l border-slate-100">
          <div className="flex items-center justify-center gap-1">
            <button onClick={onToggleExpand} className={`p-1.5 rounded transition-colors ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`} title="Produtos Relacionados">
              <Package size={14} />
            </button>
            <button onClick={() => deletarProc(proc.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Remover">
              <Trash2 size={14} />
            </button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-indigo-50/20">
          <td colSpan={8} className="p-4 border-b border-indigo-100">
            <ProdutosRelacionados salaoId={salaoId} servicoId={proc.id} onUpdate={carregar} />
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};

export default function Precificacao({ salaoId }) {
  const { showToast } = useToast();

  const [abaAtiva, setAbaAtiva] = useState('precificacao');
  const [catAtiva, setCatAtiva] = useState('SERVICO_CABELO');

  const [config, setConfig] = useState({
    custo_fixo_por_atendimento: 10.65,
    taxa_maquininha_pct: TAXA_MAQUININHA_PADRAO,
    qtd_atendimentos_mes: 100,
  });

  const [procedimentos, setProcedimentos] = useState([]);
  const [custosCompostos, setCustosCompostos] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState(null);

  const [modalProc, setModalProc] = useState(false);
  const [formProc, setFormProc] = useState({
    nome: '',
    categoria: 'SERVICO_CABELO',
    preco_p: ''
  });

  const [simAberto, setSimAberto] = useState(false);
  const [sim, setSim] = useState({
    valorCobrado: '',
    categoria: 'CABELO',
    custoProduto: '',
  });

  const engine = useMemo(() => new FinancialEngine({
    custoFixoPorAtendimento: Number(config.custo_fixo_por_atendimento),
    taxaMaquininhaPct: Number(config.taxa_maquininha_pct),
  }), [config.custo_fixo_por_atendimento, config.taxa_maquininha_pct]);

  const carregar = async () => {
    setLoading(true);
    try {
      const { data: cfgData } = await supabase
        .from('configuracoes')
        .select('custo_fixo_por_atendimento, taxa_maquininha_pct, qtd_atendimentos_mes')
        .eq('salao_id', salaoId)
        .single();

      if (cfgData) {
        setConfig({
          custo_fixo_por_atendimento: Number(cfgData.custo_fixo_por_atendimento),
          taxa_maquininha_pct: Number(cfgData.taxa_maquininha_pct),
          qtd_atendimentos_mes: Number(cfgData.qtd_atendimentos_mes || 100),
        });
      }

      const [procRes, custoRes] = await Promise.all([
        supabase.from('procedimentos').select('*').eq('salao_id', salaoId).eq('ativo', true).order('nome'),
        supabase.from('custo_composto_procedimento').select('*').eq('salao_id', salaoId)
      ]);

      const procData = procRes.data || [];
      // Remove PRODUTO_APLICADO localmente se vier do banco
      setProcedimentos(procData.filter(p => p.categoria !== 'PRODUTO_APLICADO'));

      const custoMap = {};
      if (custoRes.data) {
        custoRes.data.forEach(c => {
          custoMap[c.procedimento_id] = {
            custo_total: Number(c.custo_total_composicao),
            qtd_produtos: Number(c.qtd_produtos)
          };
        });
      }
      setCustosCompostos(custoMap);
    } catch (err) {
      showToast('Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (salaoId) carregar();
  }, [salaoId]);

  const updateConfig = (campo, valor) => {
    setConfig(prev => ({ ...prev, [campo]: valor }));
  };

  const deletarProc = async (id) => {
    if (!window.confirm('Excluir este procedimento?')) return;
    try {
      await supabase.from('procedimentos').update({ ativo: false }).eq('id', id);
      showToast('Excluído com sucesso', 'success');
      carregar();
    } catch {
      showToast('Erro ao excluir', 'error');
    }
  };

  const salvarProc = async () => {
    if (!formProc.nome.trim()) return showToast('Nome é obrigatório', 'error');

    const procData = {
      salao_id: salaoId,
      nome: formProc.nome.trim().toUpperCase(),
      categoria: formProc.categoria,
      requer_comprimento: formProc.categoria === 'SERVICO_CABELO',
      preco_p: Number(formProc.preco_p) || null,
      custo_variavel: 0,
      ativo: true
    };

    try {
      const { data, error } = await supabase.from('procedimentos').insert([procData]).select().single();
      if (error) throw error;
      setProcedimentos(prev => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)));
      showToast('Procedimento adicionado com sucesso!', 'success');
      setModalProc(false);
    } catch (err) {
      showToast('Erro: ' + err.message, 'error');
    }
  };

  const resultadoSim = useMemo(() => {
    if (!sim.valorCobrado) return null;
    return engine.calcularAtendimento({
      valorCobrado: Number(sim.valorCobrado),
      custoProduto: Number(sim.custoProduto) || 0,
    });
  }, [engine, sim]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-400 font-medium">Carregando precificação...</div>
      </div>
    );
  }

  const ABAS = [
    { key: 'precificacao', label: 'Precificação', icon: Calculator },
    { key: 'base_custos', label: 'Despesas Fixas', icon: Landmark },
    { key: 'catalogo', label: 'Despesas/Produto', icon: Package },
  ];

  // Filtramos PRODUTO_APLICADO das abas de categoria também
  const categoriasValidas = ORDEM_CATEGORIAS.filter(c => c !== 'PRODUTO_APLICADO');

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Precificação Estratégica</h1>
          <p className="text-sm text-slate-500 mt-1">Motor de cálculo baseado na sua planilha real</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {ABAS.map(aba => {
          const Icon = aba.icon;
          const ativo = abaAtiva === aba.key;
          return (
            <button key={aba.key} onClick={() => setAbaAtiva(aba.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all -mb-px ${ativo ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}>
              <Icon size={16} /> {aba.label}
            </button>
          );
        })}
      </div>

      {abaAtiva === 'precificacao' && (<>
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setSimAberto(!simAberto)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-violet-200 text-sm font-bold"
          >
            <Calculator size={16} /> Simulador "E se?"
          </button>
        </div>

        {simAberto && (
          <div className="mb-8 bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-black text-violet-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Zap size={16} className="text-violet-500" /> Simulação Rápida
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Valor Cobrado (R$)</label>
                <input type="number" step="0.01"
                  className="w-full border border-violet-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                  value={sim.valorCobrado} onChange={e => setSim({ ...sim, valorCobrado: e.target.value })}
                  placeholder="150.00"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Custo Material (R$)</label>
                <input type="number" step="0.01"
                  className="w-full border border-violet-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                  value={sim.custoProduto} onChange={e => setSim({ ...sim, custoProduto: e.target.value })}
                  placeholder="15.83"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Categoria</label>
                <select className="w-full border border-violet-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                  value={sim.categoria} onChange={e => setSim({ ...sim, categoria: e.target.value })}>
                  <option value="CABELO">Cabelo</option>
                  <option value="UNHAS">Unhas</option>
                  <option value="SOMBRANCELHA">Sobrancelha</option>
                  <option value="EXTENSÃO DE CILIOS">Cílios</option>
                </select>
              </div>
            </div>

            {resultadoSim && (
              <div className="bg-white rounded-xl border border-violet-200 p-4 mt-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Faturamento</p>
                    <p className="text-lg font-black text-slate-800">{fmt(resultadoSim.valorBruto)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Lucro Líquido</p>
                    <p className={`text-lg font-black ${resultadoSim.prejuizo ? 'text-red-500' : 'text-emerald-600'}`}>
                      {fmt(resultadoSim.lucroLiquido)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Margem Real</p>
                    <p className={`text-lg font-black ${resultadoSim.margemReal < 0 ? 'text-red-500' : resultadoSim.margemReal < 15 ? 'text-amber-500' : 'text-emerald-600'}`}>
                      {fmtPct(resultadoSim.margemReal)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-xs font-medium text-slate-500 border-t border-slate-100 pt-3">
                  <span>Maquininha: <b className="text-slate-700">{fmt(resultadoSim.valorMaquininha)}</b></span>
                  <span>•</span>
                  <span>Custo Fixo: <b className="text-slate-700">{fmt(resultadoSim.custoFixo)}</b></span>
                  <span>•</span>
                  <span>Custo Material: <b className="text-slate-700">{fmt(resultadoSim.custoProduto)}</b></span>
                </div>
                {resultadoSim.prejuizo && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                    <AlertTriangle size={14} /> Este atendimento gera PREJUÍZO. Revise o preço ou os custos.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Custo Fixo / Atend.</p>
            <div className="flex items-center gap-1">
              <span className="text-slate-400 text-xs">R$</span>
              <input type="number" step="0.01"
                className="w-full bg-transparent outline-none text-lg font-black text-slate-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                value={config.custo_fixo_por_atendimento}
                onChange={e => updateConfig('custo_fixo_por_atendimento', e.target.value)}
                onBlur={async () => { try { await supabase.from('configuracoes').update({ custo_fixo_por_atendimento: Number(config.custo_fixo_por_atendimento) }).eq('salao_id', salaoId); showToast('✓', 'success'); } catch { } }}
              />
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Taxa Maquininha</p>
            <div className="flex items-center gap-1">
              <input type="number" step="0.1" min="0" max="20"
                className="w-full bg-transparent outline-none text-lg font-black text-slate-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                value={config.taxa_maquininha_pct}
                onChange={e => updateConfig('taxa_maquininha_pct', e.target.value)}
                onBlur={async () => { try { await supabase.from('configuracoes').update({ taxa_maquininha_pct: Number(config.taxa_maquininha_pct) }).eq('salao_id', salaoId); showToast('✓', 'success'); } catch { } }}
              />
              <span className="text-slate-400 text-xs">%</span>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Atendimentos / Mês</p>
            <input type="number" step="1"
              className="w-full bg-transparent outline-none text-lg font-black text-slate-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              value={config.qtd_atendimentos_mes}
              onChange={e => updateConfig('qtd_atendimentos_mes', e.target.value)}
              onBlur={async () => { try { await supabase.from('configuracoes').update({ qtd_atendimentos_mes: Number(config.qtd_atendimentos_mes) }).eq('salao_id', salaoId); showToast('✓', 'success'); } catch { } }}
            />
          </div>
        </div>

        <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex gap-2 overflow-x-auto pb-2 w-full sm:w-auto">
            {categoriasValidas.map(key => {
              const cat = CATEGORIAS[key];
              const count = procedimentos.filter(p => p.categoria === key).length;
              return (
                <button
                  key={key}
                  onClick={() => setCatAtiva(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${catAtiva === key
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <span className="opacity-80">{cat.emoji}</span> {cat.label}
                  {count > 0 && (
                    <span className={`ml-1 w-5 h-5 rounded-full text-[10px] flex items-center justify-center ${catAtiva === key ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
                      }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => {
              setFormProc({ nome: '', categoria: catAtiva, preco_p: '' });
              setModalProc(true);
            }}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 text-sm font-bold w-full sm:w-auto justify-center"
          >
            <Plus size={16} /> Novo Serviço
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
                <th className="p-3 whitespace-nowrap">Serviço</th>
                <th className="p-3 text-center whitespace-nowrap">Custo Fixo</th>
                <th className="p-3 text-center whitespace-nowrap">Custo Mat.</th>
                <th className="p-3 text-center whitespace-nowrap">Ganho Liq.</th>
                <th className="p-3 text-center border-l border-slate-700 whitespace-nowrap">
                  Preço P
                  <span className="ml-1 text-[10px] text-slate-400 cursor-help font-normal" title="Sugerido = (Custo Fixo + Custo Material + Ganho) ÷ (1 - Taxa Maquininha)">ⓘ</span>
                </th>
                <th className="p-3 text-center whitespace-nowrap">Preço M</th>
                <th className="p-3 text-center whitespace-nowrap">Preço G</th>
                <th className="p-3 text-center border-l border-slate-700 whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody>
              {procedimentos.filter(p => p.categoria === catAtiva).length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">
                  Nenhum serviço desta categoria cadastrado.
                </td></tr>
              ) : procedimentos.filter(p => p.categoria === catAtiva).map(proc => {
                const cComp = custosCompostos[proc.id]?.custo_total || 0;
                const hasComp = cComp > 0;
                const cMaterial = hasComp ? cComp : Number(proc.custo_variavel || 0);
                const isExpanded = expandido === proc.id;

                return (
                  <TableRow
                    key={proc.id}
                    proc={proc}
                    config={config}
                    custoMaterial={cMaterial}
                    isExpanded={isExpanded}
                    onToggleExpand={() => setExpandido(isExpanded ? null : proc.id)}
                    salaoId={salaoId}
                    carregar={carregar}
                    deletarProc={deletarProc}
                  />
                );
              })}
            </tbody>
          </table>
        </div>

        <Modal open={modalProc} onClose={() => setModalProc(false)} title="Novo Serviço">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-slate-700 mb-1 block">Nome do Serviço</label>
              <input type="text" value={formProc.nome} onChange={e => setFormProc({ ...formProc, nome: e.target.value.toUpperCase() })} placeholder="Ex: BOTOX CAPILAR" className="w-full border-2 border-slate-100 p-3 rounded-2xl focus:border-slate-900 outline-none" />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700 mb-1 block">Valor Cobrado da Cliente (R$) - Padrão/Tamanho P</label>
              <input type="number" step="0.01" value={formProc.preco_p} onChange={e => setFormProc({ ...formProc, preco_p: e.target.value })} className="w-full border-2 border-slate-100 p-3 rounded-2xl focus:border-slate-900 outline-none" />
            </div>

            <button onClick={salvarProc} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 mt-4">
              Salvar e Adicionar
            </button>
          </div>
        </Modal>

      </>)}

      {abaAtiva === 'base_custos' && (
        <BaseCustos
          salaoId={salaoId}
          qtdAtendimentos={config.qtd_atendimentos_mes}
          onCustoFixoChange={(rateado) => {
            setConfig(prev => ({ ...prev, custo_fixo_por_atendimento: rateado }));
            supabase.from('configuracoes').update({ custo_fixo_por_atendimento: rateado }).eq('salao_id', salaoId);
          }}
        />
      )}

      {abaAtiva === 'catalogo' && (
        <CatalogoProdutos salaoId={salaoId} />
      )}
    </div>
  );
}
