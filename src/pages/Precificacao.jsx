import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { FinancialEngine } from '../services/FinancialEngine';
import CatalogoProdutos from './CatalogoProdutos';
import BaseCustos from '../components/BaseCustos';
import ProdutosRelacionados from '../components/ProdutosRelacionados';
import { CATEGORIAS, ORDEM_CATEGORIAS } from '../constants/categorias';
import { Plus, Trash2, Calculator, AlertTriangle, Package, Landmark, Zap, RefreshCw } from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtPct = (v) => `${Number(v || 0).toFixed(1)}%`;

const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

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

  const debouncedUpdateAndReload = useMemo(
    () =>
      debounce(async (field, value) => {
        try {
          const numValue = Number(value) || 0;
          const { error } = await supabase.from('procedimentos').update({ [field]: numValue }).eq('id', proc.id).eq('salao_id', salaoId);
          if (error) throw error;
          carregar(); // Recarrega os dados para garantir consistência
        } catch (err) {
          showToast('ERRO AO SALVAR ' + field, 'error');
        }
      }, 800),
    [proc.id, salaoId, showToast, carregar]
  );

  const handleFieldChange = (setter, field, value) => {
    setter(value);

    const numValue = Number(value);
    if (isNaN(numValue) || !isFinite(numValue) || numValue < 0) {
      return; // Não salva valores inválidos
    }

    debouncedUpdateAndReload(field, value);
  };

  const handleUpdate = async (field, value) => {
    try {
      const numValue = Number(value) || 0;
      await supabase.from('procedimentos').update({ [field]: numValue }).eq('id', proc.id).eq('salao_id', salaoId);
    } catch (err) {
      showToast('ERRO AO SALVAR ' + field, 'error');
    }
  };

  const handleGanhoBlur = async () => {
    const numGanho = Number(ganho) || 0;
    
    if (isNaN(numGanho) || !isFinite(numGanho) || numGanho < 0) {
      setGanho(0);
      return;
    }

    if (numGanho === Number(proc.ganho_liquido_desejado)) return; // nada mudou

    try {
      const { error } = await supabase
        .from('procedimentos')
        .update({ ganho_liquido_desejado: numGanho })
        .eq('id', proc.id)
        .eq('salao_id', salaoId);

      if (error) throw error;
      showToast('✓ Ganho salvo', 'success');
    } catch (err) {
      showToast('ERRO AO SALVAR GANHO', 'error');
    }
  };

  const recalcular = async () => {
    const numGanho = Number(ganho) || 0;
    const base = Number(config.custo_fixo_por_atendimento) + custoMaterial + numGanho;
    const novoP = Number((base / 0.95).toFixed(2));
    const novoM = Number((novoP * 1.20).toFixed(2));
    const novoG = Number((novoP * 1.30).toFixed(2));

    setPrecoP(novoP);
    setPrecoM(novoM);
    setPrecoG(novoG);

    try {
      const { error } = await supabase.from('procedimentos')
        .update({ preco_p: novoP, preco_m: novoM, preco_g: novoG })
        .eq('id', proc.id)
        .eq('salao_id', salaoId);

      if (error) throw error;
      showToast(`✓ P: ${fmt(novoP)} | M: ${fmt(novoM)} | G: ${fmt(novoG)}`, 'success');
    } catch (err) {
      showToast('ERRO AO RECALCULAR', 'error');
    }
  };

  return (
    <React.Fragment>
      <tr className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-sky-50/50' : ''}`}>
        <td className="p-3 font-bold text-gray-800">
          {proc.nome}
        </td>
        <td className="p-3 text-center text-gray-500 font-medium">{fmt(config.custo_fixo_por_atendimento)}</td>
        <td className="p-3 text-center font-bold text-sky-600">{fmt(custoMaterial)}</td>
        <td className="p-3 text-center">
          <input type="number" step="0.01" value={ganho} onChange={e => {
            const val = e.target.value;
            if (val.length > 8) return;
            if (val === '' || (!isNaN(Number(val)) && Number(val) >= 0)) {
              handleFieldChange(setGanho, 'ganho_liquido_desejado', val);
            }
          }} onBlur={handleGanhoBlur}
            onFocus={e => e.target.select()}
            className="w-20 text-center border border-emerald-200 rounded p-1 text-sm outline-none focus:border-emerald-500 font-bold text-emerald-700 bg-emerald-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
        </td>
        <td className="p-3 text-center border-l border-gray-200">
          <input type="number" step="0.01" value={precoP} onChange={e => {
            const val = e.target.value;
            if (val.length > 8) return;
            if (val === '' || (!isNaN(Number(val)) && Number(val) >= 0)) {
              handleFieldChange(setPrecoP, 'preco_p', val);
            }
          }}
            onFocus={e => e.target.select()}
            className="w-20 text-center border border-gray-200 rounded p-1 text-sm outline-none focus:border-sky-500 font-bold text-gray-800 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
          {/* MATEMÁTICA ÓBVIA COM MAQUININHA */}
          <div className="text-[9px] text-gray-500 mt-1 font-bold bg-sky-50/50 rounded py-0.5 px-1 whitespace-nowrap uppercase">
            ({fmt(config.custo_fixo_por_atendimento)} + {fmt(custoMaterial)} + {fmt(ganho || 0)}) ÷ 0.95
          </div>
        </td>
        <td className="p-3 text-center">
          {proc.requer_comprimento ? (
            <input type="number" step="0.01" value={precoM} onChange={e => {
              const val = e.target.value;
              if (val.length > 8) return;
              if (val === '' || (!isNaN(Number(val)) && Number(val) >= 0)) {
                handleFieldChange(setPrecoM, 'preco_m', val);
              }
            }}
              onFocus={e => e.target.select()}
              className="w-20 text-center border border-gray-200 rounded p-1 text-sm outline-none focus:border-sky-500 font-bold text-gray-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
          ) : '-'}
        </td>
        <td className="p-3 text-center">
          {proc.requer_comprimento ? (
            <input type="number" step="0.01" value={precoG} onChange={e => {
              const val = e.target.value;
              if (val.length > 8) return;
              if (val === '' || (!isNaN(Number(val)) && Number(val) >= 0)) {
                handleFieldChange(setPrecoG, 'preco_g', val);
              }
            }}
              onFocus={e => e.target.select()}
              className="w-20 text-center border border-gray-200 rounded p-1 text-sm outline-none focus:border-sky-500 font-bold text-gray-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
          ) : '-'}
        </td>
        <td className="p-3 text-center border-l border-gray-200">
          <div className="flex items-center justify-center gap-1">
            <button onClick={onToggleExpand} className={`p-1.5 rounded transition-colors ${isExpanded ? 'bg-sky-50 text-sky-600' : 'text-gray-500 hover:text-sky-600 hover:bg-sky-50'}`} title="Produtos Relacionados">
              <Package size={14} />
            </button>
            <button onClick={recalcular} className="p-1.5 text-gray-500 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors" title="Recalcular P, M e G">
              <RefreshCw size={14} />
            </button>
            <button onClick={() => deletarProc(proc.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="REMOVER">
              <Trash2 size={14} />
            </button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-sky-50/20">
          <td colSpan={8} className="p-4 border-b border-sky-100">
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
    ganho: ''
  });
  const [catalogo, setCatalogo] = useState([]);
  const [prodsSelecionados, setProdsSelecionados] = useState([]);

  const [simAberto, setSimAberto] = useState(false);
  const [sim, setSim] = useState({
    valorCobrado: '',
    categoria: 'CABELO',
    custoProduto: '',
  });

  const engine = useMemo(() => new FinancialEngine({
    custoFixoPorAtendimento: Number(config.custo_fixo_por_atendimento)
  }), [config.custo_fixo_por_atendimento]);

  const carregar = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      // Dispara todas as 4 queries simultaneamente para evitar "waterfall" na rede
      const [cfgRes, procRes, custoRes, catRes] = await Promise.all([
        supabase.from('configuracoes').select('custo_fixo_por_atendimento, qtd_atendimentos_mes').eq('salao_id', salaoId).maybeSingle(),
        supabase.from('procedimentos').select('id, nome, categoria, requer_comprimento, preco_p, preco_m, preco_g, ganho_liquido_desejado, custo_variavel, ativo').eq('salao_id', salaoId).eq('ativo', true).order('nome'),
        supabase.from('custo_composto_procedimento').select('procedimento_id, custo_total_composicao, qtd_produtos').eq('salao_id', salaoId),
        supabase.from('produtos_catalogo').select('id, nome, preco_compra, qtd_aplicacoes, custo_por_uso, ativo').eq('salao_id', salaoId).eq('ativo', true).order('nome')
      ]);

      if (cfgRes.data) {
        setConfig({
          custo_fixo_por_atendimento: Number(cfgRes.data.custo_fixo_por_atendimento),
          qtd_atendimentos_mes: Number(cfgRes.data.qtd_atendimentos_mes || 100),
        });
      }

      const procData = procRes.data || [];
      // Remove PRODUTO_APLICADO localmente se vier do banco
      setProcedimentos(procData.filter(p => p.categoria !== 'PRODUTO_APLICADO'));
      setCatalogo(catRes.data || []);

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
      showToast('ERRO AO CARREGAR DADOS', 'error');
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    if (salaoId) carregar(true);
  }, [salaoId]);

  const updateConfig = (campo, valor) => {
    setConfig(prev => ({ ...prev, [campo]: valor }));
  };

  const deletarProc = async (id) => {
    if (!window.confirm('EXCLUIR ESTE PROCEDIMENTO?')) return;
    try {
      await supabase.from('procedimentos').update({ ativo: false }).eq('id', id).eq('salao_id', salaoId);
      showToast('EXCLUÍDO COM SUCESSO', 'success');
      carregar();
    } catch {
      showToast('ERRO AO EXCLUIR', 'error');
    }
  };

  const salvarProc = async () => {
    if (!formProc.nome.trim()) return showToast('NOME É OBRIGATÓRIO', 'error');

    const procData = {
      salao_id: salaoId,
      nome: formProc.nome.trim().toUpperCase(),
      categoria: formProc.categoria,
      requer_comprimento: formProc.categoria === 'SERVICO_CABELO',
      preco_p: precoPModal || null,
      preco_m: formProc.categoria === 'SERVICO_CABELO' ? precoMModal : null,
      preco_g: formProc.categoria === 'SERVICO_CABELO' ? precoGModal : null,
      ganho_liquido_desejado: ganhoModal,
      custo_variavel: 0,
      ativo: true
    };

    try {
      const { data, error } = await supabase.from('procedimentos')
        .upsert([procData], { onConflict: 'salao_id,nome' })
        .select()
        .single();
      if (error) throw error;

      if (prodsSelecionados.length > 0) {
        const prodInserts = prodsSelecionados.map(p => ({
          salao_id: salaoId,
          procedimento_id: data.id,
          produto_id: p.id,
          qtd_usada: Number(p.qtd_usada) || 1
        }));
        await supabase.from('procedimento_produtos').insert(prodInserts);
      }

      showToast('PROCEDIMENTO ADICIONADO COM SUCESSO!', 'success');
      setModalProc(false);
      carregar();
    } catch (err) {
      showToast('ERRO: ' + err.message, 'error');
    }
  };

  const resultadoSim = useMemo(() => {
    if (!sim.valorCobrado) return null;
    return engine.calcularAtendimento({
      valorCobrado: Number(sim.valorCobrado),
      custoProduto: Number(sim.custoProduto) || 0,
    });
  }, [engine, sim]);

  // Cálculos do Modal Novo Serviço em Tempo Real
  const custoMatModal = prodsSelecionados.reduce((acc, p) => {
    const fb = (Number(p.preco_compra) || 0) / Math.max(Number(p.qtd_aplicacoes) || 1, 1);
    return acc + ((Number(p.custo_por_uso) || fb) * Number(p.qtd_usada));
  }, 0);
  const ganhoModal = Number(formProc.ganho) || 0;
  const baseModal = Number(config.custo_fixo_por_atendimento) + custoMatModal + ganhoModal;
  const precoPModal = baseModal > 0 ? baseModal / 0.95 : 0;
  const valorMaquininhaModal = precoPModal > 0 ? precoPModal - baseModal : 0;
  const precoMModal = precoPModal * 1.2;
  const precoGModal = precoPModal * 1.3;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500 font-medium uppercase">Carregando precificação...</div>
      </div>
    );
  }

  const ABAS = [
    { key: 'precificacao', label: 'Precificação', icon: Calculator },
    { key: 'base_custos', label: 'Custos Fixos', icon: Landmark },
    { key: 'catalogo', label: 'Despesas/Produto', icon: Package },
  ];

  // Filtramos PRODUTO_APLICADO das abas de categoria também
  const categoriasValidas = ORDEM_CATEGORIAS.filter(c => c !== 'PRODUTO_APLICADO');

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 uppercase">Precificação Estratégica</h1>
          <p className="text-sm text-gray-500 mt-1 uppercase">Motor de cálculo baseado na sua planilha real</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {ABAS.map(aba => {
          const Icon = aba.icon;
          const ativo = abaAtiva === aba.key;
          return (
            <button key={`tab-${aba.key}`} onClick={() => setAbaAtiva(aba.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all -mb-px ${ativo ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-600 hover:border-gray-200'
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
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-600 text-gray-800 rounded-xl hover:from-blue-700 hover:to-blue-700 transition-all shadow-lg shadow-sky-200 text-sm font-bold uppercase"
          >
            <Calculator size={16} /> Simulador "E se?"
          </button>
        </div>

        {simAberto && (
          <div className="mb-8 bg-gradient-to-br from-blue-50 to-blue-50 border border-sky-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-black text-blue-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Zap size={16} className="text-gray-500" /> Simulação Rápida
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Valor Cobrado (R$)</label>
                <input type="number" step="0.01"
                  className="w-full border border-sky-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  value={sim.valorCobrado} onChange={e => {
                    if (e.target.value.length <= 8) setSim({ ...sim, valorCobrado: e.target.value });
                  }}
                  placeholder="150.00"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Custo Material (R$)</label>
                <input type="number" step="0.01"
                  className="w-full border border-sky-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  value={sim.custoProduto} onChange={e => {
                    if (e.target.value.length <= 8) setSim({ ...sim, custoProduto: e.target.value });
                  }}
                  placeholder="15.83"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Categoria</label>
                <select className="w-full border border-sky-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  value={sim.categoria} onChange={e => setSim({ ...sim, categoria: e.target.value })}>
                  <option value="CABELO">Cabelo</option>
                  <option value="UNHAS">Unhas</option>
                  <option value="SOMBRANCELHA">Sobrancelha</option>
                  <option value="EXTENSÃO DE CILIOS">Cílios</option>
                </select>
              </div>
            </div>

            {resultadoSim && (
              <div className="bg-white rounded-xl border border-sky-200 p-4 mt-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase">Faturamento</p>
                    <p className="text-lg font-black text-gray-800">{fmt(resultadoSim.valorBruto)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase">Lucro Líquido</p>
                    <p className={`text-lg font-black ${resultadoSim.prejuizo ? 'text-red-500' : 'text-emerald-600'}`}>
                      {fmt(resultadoSim.lucroLiquido)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase">Margem Real</p>
                    <p className={`text-lg font-black ${resultadoSim.margemReal < 0 ? 'text-red-500' : resultadoSim.margemReal < 15 ? 'text-gray-500' : 'text-emerald-600'}`}>
                      {fmtPct(resultadoSim.margemReal)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-xs font-medium text-gray-500 border-t border-gray-200 pt-3 uppercase">
                  <span>Maquininha: <b className="text-gray-600">{fmt(resultadoSim.valorMaquininha)}</b></span>
                  <span>•</span>
                  <span>Custo Fixo: <b className="text-gray-600">{fmt(resultadoSim.custoFixo)}</b></span>
                  <span>•</span>
                  <span>Custo Material: <b className="text-gray-600">{fmt(resultadoSim.custoProduto)}</b></span>
                </div>
                {resultadoSim.prejuizo && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 px-3 py-2 rounded-lg uppercase">
                    <AlertTriangle size={14} /> Este atendimento gera PREJUÍZO. Revise o preço ou os custos.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Custo Fixo / Atend.</p>
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-xs">R$</span>
              <input type="number" step="0.01"
                className="w-full bg-transparent outline-none text-lg font-black text-gray-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                value={config.custo_fixo_por_atendimento}
                onChange={e => updateConfig('custo_fixo_por_atendimento', e.target.value)}
                onBlur={async () => { try { await supabase.from('configuracoes').update({ custo_fixo_por_atendimento: Number(config.custo_fixo_por_atendimento) }).eq('salao_id', salaoId); showToast('✓', 'success'); } catch { } }}
              />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Atendimentos / Mês</p>
            <input type="number" step="1"
              className="w-full bg-transparent outline-none text-lg font-black text-gray-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              value={config.qtd_atendimentos_mes}
              onChange={e => {
                if (e.target.value.length <= 8) updateConfig('qtd_atendimentos_mes', e.target.value);
              }}
              onBlur={async () => {
                try {
                  const novaQtd = Number(config.qtd_atendimentos_mes) || 1;
                  // Buscar total de custos fixos e recalcular rateio automaticamente
                  const { data: custos } = await supabase
                    .from('custos_fixos_itens')
                    .select('valor')
                    .eq('salao_id', salaoId);
                  const totalCustos = (custos || []).reduce((a, c) => a + Number(c.valor || 0), 0);
                  const novoRateado = novaQtd > 0
                    ? Number((totalCustos / novaQtd).toFixed(2))
                    : 0;
                  // Atualizar ambos no banco e no state local
                  await supabase.from('configuracoes').update({
                    qtd_atendimentos_mes: novaQtd,
                    custo_fixo_por_atendimento: novoRateado
                  }).eq('salao_id', salaoId);
                  updateConfig('custo_fixo_por_atendimento', novoRateado);
                  showToast(`✓ Custo por atendimento: R$ ${novoRateado.toFixed(2)}`, 'success');
                } catch { showToast('Erro ao salvar', 'error'); }
              }}
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
                  key={`cat-${key}`}
                  onClick={() => setCatAtiva(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 uppercase ${catAtiva === key
                    ? 'bg-white text-gray-800 shadow-md'
                    : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                >
                  <span className="opacity-80">{cat.emoji}</span> {cat.label}
                  {count > 0 && (
                    <span className={`ml-1 w-5 h-5 rounded-full text-[10px] flex items-center justify-center ${catAtiva === key ? 'bg-gray-100' : 'bg-sky-50 text-gray-500'
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
              setFormProc({ nome: '', categoria: catAtiva, ganho: '' });
              setProdsSelecionados([]);
              setModalProc(true);
            }}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-white text-gray-800 rounded-xl hover:bg-sky-500 transition-all shadow-lg shadow-sky-200 text-sm font-bold w-full sm:w-auto justify-center uppercase"
          >
            <Plus size={16} /> Novo Serviço
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-white text-gray-800 text-[10px] uppercase font-bold tracking-wider">
                <th className="p-3 whitespace-nowrap">Serviço</th>
                <th className="p-3 text-center whitespace-nowrap">Custo Fixo</th>
                <th className="p-3 text-center whitespace-nowrap"><span className="text-emerald-500 font-black mr-1">+</span>Custo Mat.</th>
                <th className="p-3 text-center whitespace-nowrap"><span className="text-emerald-500 font-black mr-1">+</span>Ganho Liq.</th>
                <th className="p-3 text-center border-l border-gray-200 whitespace-nowrap">
                  <span className="text-gray-500 font-black mr-1">=</span>Preço P
                </th>
                <th className="p-3 text-center whitespace-nowrap">Preço M</th>
                <th className="p-3 text-center whitespace-nowrap">Preço G</th>
                <th className="p-3 text-center border-l border-gray-200 whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody>
              {procedimentos.filter(p => p.categoria === catAtiva).length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500">
                  NENHUM SERVIÇO DESTA CATEGORIA CADASTRADO.
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

        <Modal open={modalProc} onClose={() => setModalProc(false)} title="NOVO SERVIÇO">
          <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-2">
            <div>
              <label className="text-xs font-black text-gray-500 mb-1 block uppercase">Nome do Serviço</label>
              <input type="text" value={formProc.nome} onChange={e => setFormProc({ ...formProc, nome: e.target.value.toUpperCase() })} placeholder="EX: NUTRIÇÃO" className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-sky-500 outline-none font-bold uppercase" />
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <label className="text-xs font-black text-gray-500 mb-2 block uppercase">Produtos Utilizados (Custo Mat.)</label>
              <select className="w-full border-2 border-gray-200 p-3 rounded-xl text-xs font-bold uppercase mb-3 outline-none" onChange={(e) => {
                const id = e.target.value;
                if (!id) return;
                const p = catalogo.find(c => c.id === id);
                if (p && !prodsSelecionados.find(x => x.id === id)) {
                  setProdsSelecionados([...prodsSelecionados, { ...p, qtd_usada: 1 }]);
                }
                e.target.value = "";
              }}>
                <option value="">+ ADICIONAR PRODUTO...</option>
                {catalogo.map(p => {
                  const fb = (Number(p.preco_compra) || 0) / Math.max(Number(p.qtd_aplicacoes) || 1, 1);
                  return <option key={p.id} value={p.id}>{p.nome} - {fmt(p.custo_por_uso || fb)} / DOSE</option>
                })}
              </select>

              {prodsSelecionados.length > 0 && (
                <div className="space-y-2 mb-2">
                  {prodsSelecionados.map(p => {
                    const fb = (Number(p.preco_compra) || 0) / Math.max(Number(p.qtd_aplicacoes) || 1, 1);
                    const c = Number(p.custo_por_uso) || fb;
                    return (
                      <div key={p.id} className="flex items-center justify-between bg-white border border-gray-200 p-2 rounded-lg">
                        <span className="text-xs font-bold text-gray-600 truncate flex-1 uppercase">{p.nome}</span>
                        <div className="flex items-center gap-3">
                          <input type="number" min="0.1" step="0.1" className="w-14 text-center border border-gray-200 rounded text-xs p-1 font-bold"
                            value={p.qtd_usada} onChange={e => {
                              if (e.target.value.length > 8) return;
                              const val = Number(e.target.value);
                              setProdsSelecionados(prodsSelecionados.map(x => x.id === p.id ? { ...x, qtd_usada: val } : x));
                            }} />
                          <span className="text-xs font-bold text-sky-600 w-16 text-right">{fmt(c * p.qtd_usada)}</span>
                          <button onClick={() => setProdsSelecionados(prodsSelecionados.filter(x => x.id !== p.id))} className="text-red-400 hover:text-red-600 p-1">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-black text-gray-500 mb-1 block uppercase">Ganho Líquido Desejado (R$)</label>
              <input type="number" step="0.01" value={formProc.ganho} onChange={e => {
                if (e.target.value.length <= 8) setFormProc({ ...formProc, ganho: e.target.value });
              }} className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-emerald-500 outline-none font-bold text-emerald-700 bg-emerald-50" placeholder="50.00" />
            </div>

            <div className="bg-white rounded-2xl p-5 text-gray-800 shadow-xl">
              <h3 className="text-sm font-black text-emerald-400 uppercase mb-4 flex items-center gap-2"><Calculator size={16} /> Resumo Matemático</h3>
              <div className="space-y-2 text-xs font-medium text-gray-600 uppercase">
                <div className="flex justify-between"><span>Custo Fixo:</span> <span className="text-gray-800">{fmt(config.custo_fixo_por_atendimento)} (Automático)</span></div>
                <div className="flex justify-between"><span>Custo Mat.:</span> <span className="text-gray-800">{fmt(custoMatModal)} (Soma dos {prodsSelecionados.length} Acima)</span></div>
                <div className="flex justify-between"><span>Ganho Líq.:</span> <span className="text-gray-800">{fmt(ganhoModal)} (Você Digita)</span></div>
                <div className="border-t border-gray-200 my-2 pt-2 flex justify-between font-black text-sm text-gray-500"><span>SUBTOTAL (BASE):</span> <span>{fmt(baseModal)}</span></div>
                <div className="flex justify-between text-gray-500"><span>Taxa Maquininha (5%):</span> <span>+ {fmt(valorMaquininhaModal)} (÷ 0,95)</span></div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-xl p-3 flex justify-between items-center">
                  <span className="font-black text-emerald-400 uppercase">PREÇO FINAL (P):</span>
                  <div className="text-right">
                    <span className="text-lg font-black text-gray-800 block">{fmt(precoPModal)}</span>
                    <span className="text-[9px] text-emerald-200 uppercase">(Já cobre a maquininha)</span>
                  </div>
                </div>
                {formProc.categoria === 'SERVICO_CABELO' && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-sky-500 rounded-xl p-2 text-center border border-gray-200 flex justify-between items-center px-3">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">PREÇO M (+20%)</span>
                      <span className="font-black text-gray-800">{fmt(precoMModal)}</span>
                    </div>
                    <div className="bg-sky-500 rounded-xl p-2 text-center border border-gray-200 flex justify-between items-center px-3">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">PREÇO G (+30%)</span>
                      <span className="font-black text-gray-800">{fmt(precoGModal)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button onClick={salvarProc} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 mt-2 uppercase">
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
