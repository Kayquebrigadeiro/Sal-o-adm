import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import { FinancialEngine } from '../services/FinancialEngine';
import { TAXA_MAQUININHA_PADRAO, MULTIPLICADOR_COMPRIMENTO } from '../services/financialConstants';
import { Plus, Trash2, Calculator, TrendingUp, AlertTriangle, ChevronDown, ChevronUp, Zap, Save, RefreshCw } from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtPct = (v) => `${Number(v || 0).toFixed(1)}%`;

export default function Precificacao({ salaoId }) {
  const { showToast } = useToast();

  // ─── Estado das configurações (do Supabase) ───
  const [config, setConfig] = useState({
    custo_fixo_por_atendimento: 10.65,
    taxa_maquininha_pct: TAXA_MAQUININHA_PADRAO,
  });
  const [configAlterada, setConfigAlterada] = useState(false);

  // ─── Estado dos procedimentos (do Supabase) ───
  const [procedimentos, setProcedimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState(null); // ID do proc expandido pra ver detalhes

  // ─── Simulador "E se?" ───
  const [simAberto, setSimAberto] = useState(false);
  const [sim, setSim] = useState({
    valorCobrado: '',
    categoria: 'CABELO',
    custoProduto: '',
    cargo: 'PROPRIETARIO',
    comissao: 30,
  });

  // ─── Instancia do Motor Financeiro (reage à config) ───
  const engine = useMemo(() => new FinancialEngine({
    custoFixoPorAtendimento: Number(config.custo_fixo_por_atendimento),
    taxaMaquininhaPct: Number(config.taxa_maquininha_pct),
  }), [config.custo_fixo_por_atendimento, config.taxa_maquininha_pct]);

  // ─── Carregar dados do Supabase ───
  useEffect(() => {
    if (!salaoId) return;
    const carregar = async () => {
      setLoading(true);
      try {
        // Configurações
        const { data: cfgData } = await supabase
          .from('configuracoes')
          .select('custo_fixo_por_atendimento, taxa_maquininha_pct')
          .eq('salao_id', salaoId)
          .single();

        if (cfgData) {
          setConfig({
            custo_fixo_por_atendimento: Number(cfgData.custo_fixo_por_atendimento),
            taxa_maquininha_pct: Number(cfgData.taxa_maquininha_pct),
          });
        }

        // Procedimentos
        const { data: procData } = await supabase
          .from('procedimentos')
          .select('*')
          .eq('salao_id', salaoId)
          .eq('ativo', true)
          .order('nome');

        setProcedimentos(procData || []);
      } catch (err) {
        showToast('Erro ao carregar dados', 'error');
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, [salaoId]);

  // ─── Salvar config no Supabase ───
  const salvarConfig = async () => {
    try {
      await supabase
        .from('configuracoes')
        .update({
          custo_fixo_por_atendimento: Number(config.custo_fixo_por_atendimento),
          taxa_maquininha_pct: Number(config.taxa_maquininha_pct),
        })
        .eq('salao_id', salaoId);
      setConfigAlterada(false);
      showToast('Configurações salvas!', 'success');
    } catch (err) {
      showToast('Erro ao salvar', 'error');
    }
  };

  const updateConfig = (campo, valor) => {
    setConfig(prev => ({ ...prev, [campo]: valor }));
    setConfigAlterada(true);
  };

  // ─── Calcular preço sugerido e lucro para um procedimento ───
  const calcularProcedimento = (proc, comprimento) => {
    const custoProd = Number(proc.custo_variavel) || 0;
    const precoMap = { P: proc.preco_p, M: proc.preco_m, G: proc.preco_g };
    const precoCobrado = Number(precoMap[comprimento]) || 0;
    const comissao = Number(proc.porcentagem_profissional) || 0;

    // Cálculo de lucro real (como se fosse FUNCIONÁRIO, pior caso)
    const resultado = engine.calcularAtendimento({
      valorCobrado: precoCobrado,
      categoriaProcedimento: proc.categoria || 'CABELO',
      percentualComissao: comissao,
      custoProduto: custoProd,
      cargoProfissional: 'FUNCIONARIO',
    });

    // Preço sugerido via engenharia reversa
    const custoTotal = custoProd + Number(config.custo_fixo_por_atendimento);
    const sugerido = FinancialEngine.calcularPrecoSugerido({
      custoTotal,
      taxaMaq: Number(config.taxa_maquininha_pct) / 100,
      taxaCom: comissao / 100,
      margemAlvo: 0.20,
    });

    return { resultado, sugerido };
  };

  const aplicarPrecoSugerido = async (proc, sugeridoP, sugeridoM, sugeridoG) => {
    try {
      const updates = { preco_p: sugeridoP };
      if (proc.requer_comprimento) {
        updates.preco_m = sugeridoM || (sugeridoP * 1.2);
        updates.preco_g = sugeridoG || (sugeridoP * 1.3);
      }
      const { error } = await supabase.from('procedimentos').update(updates).eq('id', proc.id);
      if (error) throw error;
      
      setProcedimentos(prev => prev.map(pr => pr.id === proc.id ? { ...pr, ...updates } : pr));
      showToast('Preço sugerido aplicado com sucesso!', 'success');
    } catch (err) {
      showToast('Erro ao aplicar preço', 'error');
    }
  };

  // ─── Calcular Simulação ───
  const resultadoSim = useMemo(() => {
    if (!sim.valorCobrado) return null;
    return engine.calcularAtendimento({
      valorCobrado: Number(sim.valorCobrado),
      categoriaProcedimento: sim.categoria,
      percentualComissao: Number(sim.comissao),
      custoProduto: Number(sim.custoProduto) || 0,
      cargoProfissional: sim.cargo,
    });
  }, [engine, sim]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-400 font-medium">Carregando precificação...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Precificação Estratégica</h1>
          <p className="text-sm text-slate-500 mt-1">Motor de cálculo baseado na sua planilha real</p>
        </div>
        <button
          onClick={() => setSimAberto(!simAberto)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-violet-200 text-sm font-bold"
        >
          <Calculator size={16} /> Simulador "E se?"
        </button>
      </div>

      {/* ═══ SIMULADOR "E SE?" ═══ */}
      {simAberto && (
        <div className="mb-8 bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-black text-violet-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Zap size={16} className="text-violet-500" /> Simulação Rápida
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Valor Cobrado (R$)</label>
              <input type="number" step="0.01"
                className="w-full border border-violet-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                value={sim.valorCobrado} onChange={e => setSim({...sim, valorCobrado: e.target.value})}
                placeholder="150.00"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Custo Material (R$)</label>
              <input type="number" step="0.01"
                className="w-full border border-violet-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                value={sim.custoProduto} onChange={e => setSim({...sim, custoProduto: e.target.value})}
                placeholder="15.83"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Comissão (%)</label>
              <input type="number"
                className="w-full border border-violet-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                value={sim.comissao} onChange={e => setSim({...sim, comissao: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Quem Atende?</label>
              <select className="w-full border border-violet-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                value={sim.cargo} onChange={e => setSim({...sim, cargo: e.target.value})}>
                <option value="PROPRIETARIO">Proprietária</option>
                <option value="FUNCIONARIO">Funcionário(a)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Categoria</label>
              <select className="w-full border border-violet-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                value={sim.categoria} onChange={e => setSim({...sim, categoria: e.target.value})}>
                <option value="CABELO">Cabelo</option>
                <option value="UNHAS">Unhas</option>
                <option value="SOMBRANCELHA">Sobrancelha</option>
                <option value="EXTENSÃO DE CILIOS">Cílios</option>
              </select>
            </div>
          </div>

          {/* Resultado da Simulação */}
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
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Rendimento Prof.</p>
                  <p className="text-lg font-black text-blue-600">{fmt(resultadoSim.rendimentoProfissional)}</p>
                </div>
              </div>
              {/* Desmembramento */}
              <div className="flex flex-wrap gap-3 text-xs font-medium text-slate-500 border-t border-slate-100 pt-3">
                <span>Maquininha: <b className="text-slate-700">{fmt(resultadoSim.valorMaquininha)}</b></span>
                <span>•</span>
                <span>Comissão: <b className="text-slate-700">{fmt(resultadoSim.valorComissao)}</b></span>
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

      {/* ═══ CONFIGURAÇÕES GLOBAIS ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full -mr-6 -mt-6" />
          <label className="block text-[10px] uppercase opacity-60 mb-2 tracking-wider font-bold">Custo Fixo / Atendimento</label>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">R$</span>
            <input type="number" step="0.01"
              className="bg-transparent border-b border-slate-700 w-full outline-none focus:border-emerald-400 text-2xl font-black"
              value={config.custo_fixo_por_atendimento}
              onChange={e => updateConfig('custo_fixo_por_atendimento', e.target.value)}
            />
          </div>
        </div>

        <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -mr-6 -mt-6" />
          <label className="block text-[10px] uppercase opacity-60 mb-2 tracking-wider font-bold">Taxa Maquininha</label>
          <div className="flex items-center gap-2">
            <input type="number" step="0.1" min="0" max="20"
              className="bg-transparent border-b border-slate-700 w-full outline-none focus:border-blue-400 text-2xl font-black"
              value={config.taxa_maquininha_pct}
              onChange={e => updateConfig('taxa_maquininha_pct', e.target.value)}
            />
            <span className="text-slate-400 text-sm">%</span>
          </div>
        </div>

        <div className="flex items-end">
          {configAlterada ? (
            <button onClick={salvarConfig}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 text-sm">
              <Save size={16} /> Salvar Configurações
            </button>
          ) : (
            <div className="w-full bg-slate-100 text-slate-400 py-4 rounded-2xl font-bold text-center text-sm flex items-center justify-center gap-2">
              <RefreshCw size={14} /> Configurações atualizadas
            </div>
          )}
        </div>
      </div>

      {/* ═══ TABELA DE PROCEDIMENTOS ═══ */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
              <th className="p-3" rowSpan={2}>Serviço</th>
              <th className="p-3 text-center" rowSpan={2}>Comissão</th>
              <th className="p-3 text-center" rowSpan={2}>Custo Mat.</th>
              <th className="p-3 text-center border-l border-slate-700" colSpan={3}>Cabelo P</th>
              <th className="p-3 text-center border-l border-slate-700" colSpan={3}>Cabelo M (+{MULTIPLICADOR_COMPRIMENTO.M}%)</th>
              <th className="p-3 text-center border-l border-slate-700" colSpan={3}>Cabelo G (+{MULTIPLICADOR_COMPRIMENTO.G}%)</th>
              <th className="p-3 text-center" rowSpan={2}></th>
            </tr>
            <tr className="bg-slate-800 text-slate-300 text-[10px] uppercase font-bold tracking-wider">
              <th className="p-2 text-center border-l border-slate-700">Preço</th>
              <th className="p-2 text-center">Lucro</th>
              <th className="p-2 text-right text-emerald-400">Margem</th>
              <th className="p-2 text-center border-l border-slate-700">Preço</th>
              <th className="p-2 text-center">Lucro</th>
              <th className="p-2 text-right text-emerald-400">Margem</th>
              <th className="p-2 text-center border-l border-slate-700">Preço</th>
              <th className="p-2 text-center">Lucro</th>
              <th className="p-2 text-right text-emerald-400">Margem</th>
            </tr>
          </thead>
          <tbody>
            {procedimentos.length === 0 ? (
              <tr><td colSpan={13} className="text-center py-12 text-slate-400">
                Nenhum procedimento cadastrado. Adicione pelo Wizard ou Configurações.
              </td></tr>
            ) : procedimentos.map(proc => {
              const p = calcularProcedimento(proc, 'P');
              const m = calcularProcedimento(proc, 'M');
              const g = calcularProcedimento(proc, 'G');
              const isExpanded = expandido === proc.id;

              const CelulaLucro = ({ res }) => {
                const r = res.resultado;
                return (
                  <>
                    <td className="p-2 text-center font-bold text-slate-800">
                      {fmt(r.valorBruto)}
                    </td>
                    <td className={`p-2 text-center font-black ${r.prejuizo ? 'text-red-500' : 'text-emerald-600'}`}>
                      {fmt(r.lucroLiquido)}
                    </td>
                    <td className={`p-2 text-right font-black text-xs ${r.margemReal < 0 ? 'text-red-500' : r.margemReal < 15 ? 'text-amber-500' : 'text-emerald-600'}`}>
                      {fmtPct(r.margemReal)}
                    </td>
                  </>
                );
              };

              return (
                <tr key={proc.id}
                  className={`border-b border-slate-100 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50/60'}`}
                  onClick={() => setExpandido(isExpanded ? null : proc.id)}
                >
                  {/* Nome */}
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${proc.categoria === 'CABELO' ? 'bg-violet-500' : proc.categoria === 'UNHAS' ? 'bg-pink-500' : 'bg-amber-500'}`} />
                      <span className="font-bold text-slate-800">{proc.nome}</span>
                      {isExpanded ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-300" />}
                    </div>
                    {isExpanded && (
                      <div className="mt-2 text-[10px] text-slate-400 space-y-1">
                        <p>Maquininha: {fmtPct(config.taxa_maquininha_pct)} • Custo Fixo: {fmt(config.custo_fixo_por_atendimento)}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-violet-500 font-bold">
                            Preço Sugerido (margem 20%): {p.sugerido.erro ? '⚠️ Impossível' : fmt(p.sugerido.precoSugerido)}
                          </p>
                          {!p.sugerido.erro && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                aplicarPrecoSugerido(
                                  proc, 
                                  p.sugerido.precoSugerido, 
                                  m?.sugerido?.precoSugerido, 
                                  g?.sugerido?.precoSugerido
                                );
                              }}
                              className="px-2 py-1 bg-violet-100 text-violet-700 rounded hover:bg-violet-200 text-[10px] font-bold transition-colors"
                            >
                              Aplicar Sugestão
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Comissão */}
                  <td className="p-2 text-center">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {proc.porcentagem_profissional}%
                    </span>
                  </td>

                  {/* Custo Material */}
                  <td className="p-2 text-center text-slate-500 font-medium">
                    {fmt(proc.custo_variavel)}
                  </td>

                  {/* Colunas P */}
                  <CelulaLucro res={p} />

                  {/* Colunas M */}
                  {proc.requer_comprimento ? (
                    <CelulaLucro res={m} />
                  ) : (
                    <><td className="p-2 text-center text-slate-300 border-l border-slate-100" colSpan={3}>—</td></>
                  )}

                  {/* Colunas G */}
                  {proc.requer_comprimento ? (
                    <CelulaLucro res={g} />
                  ) : (
                    <><td className="p-2 text-center text-slate-300 border-l border-slate-100" colSpan={3}>—</td></>
                  )}

                  {/* Indicador */}
                  <td className="p-2 text-center" onClick={e => e.stopPropagation()}>
                    {p.resultado.prejuizo && (
                      <span className="inline-flex items-center text-red-500" title="Prejuízo no tamanho P">
                        <AlertTriangle size={14} />
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ═══ LEGENDA ═══ */}
      <div className="mt-6 flex flex-wrap gap-4 text-[10px] text-slate-400 font-medium">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Margem ≥ 15%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Margem &lt; 15%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Prejuízo</span>
        <span className="ml-auto">Motor: FinancialEngine v1.0 • Cálculos em centavos</span>
      </div>
    </div>
  );
}
