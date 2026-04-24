import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { FinancialEngine } from '../services/FinancialEngine';
import { TAXA_MAQUININHA_PADRAO, MULTIPLICADOR_COMPRIMENTO } from '../services/financialConstants';
import { Plus, Trash2, Calculator, TrendingUp, AlertTriangle, ChevronDown, ChevronUp, Zap, Save, RefreshCw, DollarSign, ArrowRight, Sparkles, Pencil, Settings, Receipt, Info } from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtPct = (v) => `${Number(v || 0).toFixed(1)}%`;

export default function Precificacao({ salaoId }) {
  const { showToast } = useToast();

  // ─── Aba ativa ───
  const [abaAtiva, setAbaAtiva] = useState('precificacao');

  // ─── Estado das configurações (do Supabase) ───
  const [config, setConfig] = useState({
    custo_fixo_por_atendimento: 10.65,
    taxa_maquininha_pct: TAXA_MAQUININHA_PADRAO,
    margem_lucro_desejada_pct: 20,
    qtd_atendimentos_mes: 100,
  });
  const [configAlterada, setConfigAlterada] = useState(false);

  // ─── Estado dos procedimentos (do Supabase) ───
  const [procedimentos, setProcedimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState(null); // ID do proc expandido pra ver detalhes

  // ─── Ganho líquido desejado por procedimento (mapa: procId → valor) ───
  const [ganhoMap, setGanhoMap] = useState({});

  // ─── Estado das despesas (aba Despesas) ───
  const [despesas, setDespesas] = useState([]);
  const [loadingDesp, setLoadingDesp] = useState(false);
  const [modalDesp, setModalDesp] = useState(false);
  const [despEdit, setDespEdit] = useState(null);
  const [formDesp, setFormDesp] = useState({ data: '', descricao: '', tipo: 'OUTRO', valor: '', valor_pago: '' });
  const [mesSel, setMesSel] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; });

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
          .select('custo_fixo_por_atendimento, taxa_maquininha_pct, margem_lucro_desejada_pct, qtd_atendimentos_mes')
          .eq('salao_id', salaoId)
          .single();

        if (cfgData) {
          setConfig({
            custo_fixo_por_atendimento: Number(cfgData.custo_fixo_por_atendimento),
            taxa_maquininha_pct: Number(cfgData.taxa_maquininha_pct),
            margem_lucro_desejada_pct: Number(cfgData.margem_lucro_desejada_pct || 20),
            qtd_atendimentos_mes: Number(cfgData.qtd_atendimentos_mes || 100),
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

        // Pré-popular mapa de ganho líquido com valores salvos no banco
        const gMap = {};
        (procData || []).forEach(p => {
          if (p.ganho_liquido_desejado) gMap[p.id] = Number(p.ganho_liquido_desejado);
        });
        setGanhoMap(gMap);
      } catch (err) {
        showToast('Erro ao carregar dados', 'error');
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, [salaoId]);

  // ─── Carregar despesas por mês ───
  const carregarDespesas = async () => {
    setLoadingDesp(true);
    try {
      const [ano, mes] = mesSel.split('-');
      const inicio = `${ano}-${mes}-01`;
      const fim = new Date(ano, mes, 0).toISOString().split('T')[0];
      const { data } = await supabase.from('despesas').select('*').eq('salao_id', salaoId).gte('data', inicio).lte('data', fim).order('data', { ascending: false });
      setDespesas(data || []);
    } catch { showToast('Erro ao carregar despesas', 'error'); }
    finally { setLoadingDesp(false); }
  };
  useEffect(() => { if (salaoId && abaAtiva === 'despesas') carregarDespesas(); }, [salaoId, mesSel, abaAtiva]);

  // ─── CRUD Despesas ───
  const abrirModalDesp = (d = null) => {
    setDespEdit(d);
    setFormDesp(d ? { data: d.data, descricao: d.descricao, tipo: d.tipo, valor: d.valor, valor_pago: d.valor_pago } : { data: new Date().toISOString().split('T')[0], descricao: '', tipo: 'OUTRO', valor: '', valor_pago: '0' });
    setModalDesp(true);
  };
  const salvarDesp = async () => {
    try {
      const payload = { data: formDesp.data, descricao: formDesp.descricao, tipo: formDesp.tipo, valor: Number(formDesp.valor), valor_pago: Number(formDesp.valor_pago || 0) };
      if (despEdit) { await supabase.from('despesas').update(payload).eq('id', despEdit.id).eq('salao_id', salaoId); }
      else { await supabase.from('despesas').insert({ ...payload, salao_id: salaoId }); }
      setModalDesp(false); carregarDespesas(); showToast(despEdit ? 'Despesa atualizada!' : 'Despesa criada!', 'success');
    } catch { showToast('Erro ao salvar despesa', 'error'); }
  };
  const deletarDesp = async (id) => {
    if (!confirm('Deletar esta despesa?')) return;
    try { await supabase.from('despesas').delete().eq('id', id).eq('salao_id', salaoId); carregarDespesas(); showToast('Despesa deletada', 'success'); }
    catch { showToast('Erro ao deletar', 'error'); }
  };

  // ─── Salvar config no Supabase ───
  const salvarConfig = async () => {
    try {
      await supabase
        .from('configuracoes')
        .update({
          custo_fixo_por_atendimento: Number(config.custo_fixo_por_atendimento),
          taxa_maquininha_pct: Number(config.taxa_maquininha_pct),
          margem_lucro_desejada_pct: Number(config.margem_lucro_desejada_pct),
          qtd_atendimentos_mes: Number(config.qtd_atendimentos_mes),
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

  // ─── Calcular lucro real para um procedimento num dado comprimento ───
  const calcularProcedimento = (proc, comprimento) => {
    const custoProd = Number(proc.custo_variavel) || 0;
    const precoP = Number(proc.preco_p) || 0;
    const precoMap = {
      P: precoP,
      M: Number(proc.preco_m) || (precoP * 1.20),
      G: Number(proc.preco_g) || (precoP * 1.30),
    };
    const precoCobrado = precoMap[comprimento] || 0;
    const comissao = Number(proc.porcentagem_profissional) || 0;

    const resultado = engine.calcularAtendimento({
      valorCobrado: precoCobrado,
      categoriaProcedimento: proc.categoria || 'CABELO',
      percentualComissao: comissao,
      custoProduto: custoProd,
      cargoProfissional: 'FUNCIONARIO',
    });

    return { resultado };
  };

  // ─── Calculadora P/M/G a partir do ganho líquido desejado ───
  const calcularPMG = (proc) => {
    const ganho = ganhoMap[proc.id];
    if (!ganho || ganho <= 0) return null;
    return engine.calcularPrecoPMG({
      custoFixo: Number(config.custo_fixo_por_atendimento),
      custoMaterial: Number(proc.custo_variavel) || 0,
      ganhoLiquido: ganho,
    });
  };

  const aplicarPrecoCalculado = async (proc) => {
    const pmg = calcularPMG(proc);
    if (!pmg || pmg.erro) return showToast('Preencha o ganho líquido desejado', 'error');
    try {
      const updates = {
        ganho_liquido_desejado: ganhoMap[proc.id],
        preco_p: pmg.precoP,
      };
      if (proc.requer_comprimento) {
        updates.preco_m = pmg.precoM;
        updates.preco_g = pmg.precoG;
      }
      const { error } = await supabase.from('procedimentos').update(updates).eq('id', proc.id).eq('salao_id', salaoId);
      if (error) throw error;
      setProcedimentos(prev => prev.map(pr => pr.id === proc.id ? { ...pr, ...updates } : pr));
      showToast(`Preços de ${proc.nome} atualizados! P=${fmt(pmg.precoP)}`, 'success');
    } catch (err) {
      showToast('Erro ao salvar preços: ' + err.message, 'error');
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

  const TIPOS_DESPESA = [
    { value: 'ALUGUEL', label: 'Aluguel' }, { value: 'ENERGIA', label: 'Energia' }, { value: 'AGUA', label: 'Água' },
    { value: 'INTERNET', label: 'Internet' }, { value: 'MATERIAL', label: 'Material' }, { value: 'EQUIPAMENTO', label: 'Equipamento' },
    { value: 'FORNECEDOR', label: 'Fornecedor' }, { value: 'FUNCIONARIO', label: 'Funcionário' }, { value: 'OUTRO', label: 'Outro' },
  ];
  const totalDesp = despesas.reduce((a, d) => a + Number(d.valor || 0), 0);
  const totalDespPago = despesas.reduce((a, d) => a + Number(d.valor_pago || 0), 0);

  const ABAS = [
    { key: 'precificacao', label: 'Precificação', icon: Calculator },
    { key: 'despesas', label: 'Despesas', icon: Receipt },
    { key: 'custos_fixos', label: 'Custos Fixos', icon: Settings },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Precificação Estratégica</h1>
          <p className="text-sm text-slate-500 mt-1">Motor de cálculo baseado na sua planilha real</p>
        </div>
      </div>

      {/* ═══ ABAS ═══ */}
      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {ABAS.map(aba => {
          const Icon = aba.icon;
          const ativo = abaAtiva === aba.key;
          return (
            <button key={aba.key} onClick={() => setAbaAtiva(aba.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all -mb-px ${
                ativo ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}>
              <Icon size={16} /> {aba.label}
            </button>
          );
        })}
      </div>

      {/* ═══ ABA: PRECIFICAÇÃO ═══ */}
      {abaAtiva === 'precificacao' && (<>
      <div className="flex justify-end mb-4">
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
                    {isExpanded && (() => {
                      const pmg = calcularPMG(proc);
                      return (
                      <div className="mt-3 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl p-3 border border-violet-200 space-y-3" onClick={e => e.stopPropagation()}>
                        <p className="text-[10px] font-black text-violet-700 uppercase tracking-wider flex items-center gap-1">
                          <Sparkles size={12} /> Calculadora de Preço (Fórmula da Planilha)
                        </p>
                        {/* Linha de inputs */}
                        <div className="flex flex-wrap items-end gap-2">
                          <div className="flex-shrink-0">
                            <span className="text-[9px] font-bold text-slate-400 block">Custo Fixo</span>
                            <span className="text-xs font-black text-slate-600 bg-white px-2 py-1 rounded-lg border border-slate-200">{fmt(config.custo_fixo_por_atendimento)}</span>
                          </div>
                          <span className="text-slate-300 font-bold pb-1">+</span>
                          <div className="flex-shrink-0">
                            <span className="text-[9px] font-bold text-slate-400 block">Material</span>
                            <span className="text-xs font-black text-slate-600 bg-white px-2 py-1 rounded-lg border border-slate-200">{fmt(proc.custo_variavel)}</span>
                          </div>
                          <span className="text-slate-300 font-bold pb-1">+</span>
                          <div className="flex-1 min-w-[100px]">
                            <span className="text-[9px] font-bold text-violet-600 block">Ganho Líquido Desejado</span>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-violet-400">R$</span>
                              <input type="number" step="0.01"
                                className="w-full bg-white border-2 border-violet-300 rounded-lg pl-7 pr-2 py-1 text-xs font-black text-violet-700 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                                value={ganhoMap[proc.id] || ''}
                                onChange={e => setGanhoMap(prev => ({ ...prev, [proc.id]: Number(e.target.value) || 0 }))}
                                placeholder="95,00"
                              />
                            </div>
                          </div>
                        </div>
                        {/* Resultado */}
                        {pmg && !pmg.erro && (
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="bg-white rounded-lg px-3 py-1.5 border border-emerald-200 shadow-sm">
                              <span className="text-[9px] font-bold text-slate-400 block">Subtotal</span>
                              <span className="text-xs font-black text-slate-600">{fmt(pmg.base)}</span>
                            </div>
                            <ArrowRight size={14} className="text-slate-300" />
                            <div className="bg-emerald-50 rounded-lg px-3 py-1.5 border border-emerald-300 shadow-sm">
                              <span className="text-[9px] font-bold text-emerald-600 block">Preço P</span>
                              <span className="text-sm font-black text-emerald-700">{fmt(pmg.precoP)}</span>
                            </div>
                            {proc.requer_comprimento && (
                              <>
                                <div className="bg-blue-50 rounded-lg px-3 py-1.5 border border-blue-200 shadow-sm">
                                  <span className="text-[9px] font-bold text-blue-500 block">M (×1.20)</span>
                                  <span className="text-sm font-black text-blue-700">{fmt(pmg.precoM)}</span>
                                </div>
                                <div className="bg-amber-50 rounded-lg px-3 py-1.5 border border-amber-200 shadow-sm">
                                  <span className="text-[9px] font-bold text-amber-600 block">G (×1.30)</span>
                                  <span className="text-sm font-black text-amber-700">{fmt(pmg.precoG)}</span>
                                </div>
                              </>
                            )}
                            <button
                              onClick={() => aplicarPrecoCalculado(proc)}
                              className="ml-auto px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg text-[10px] font-black hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md shadow-emerald-200 flex items-center gap-1"
                            >
                              <Save size={12} /> Aplicar Preços
                            </button>
                          </div>
                        )}
                        <p className="text-[9px] text-slate-400">Fórmula: ({fmt(config.custo_fixo_por_atendimento)} + {fmt(proc.custo_variavel)} + ganho) ÷ {(1 - Number(config.taxa_maquininha_pct)/100).toFixed(2)} = Preço P</p>
                      </div>
                      );
                    })()}
                  </td>

                  {/* Comissão (editável) */}
                  <td className="p-2 text-center" onClick={e => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-0.5 bg-slate-100 rounded-full px-1 py-0.5">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        className="w-10 bg-transparent text-center text-[10px] font-bold text-slate-600 outline-none focus:text-emerald-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={proc.porcentagem_profissional ?? 0}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setProcedimentos(prev => prev.map(pr => pr.id === proc.id ? { ...pr, porcentagem_profissional: val } : pr));
                        }}
                        onBlur={async (e) => {
                          const val = Number(e.target.value);
                          try {
                            const { error } = await supabase.from('procedimentos').update({ porcentagem_profissional: val }).eq('id', proc.id).eq('salao_id', salaoId);
                            if (error) throw error;
                            showToast(`Comissão de ${proc.nome} → ${val}%`, 'success');
                          } catch (err) {
                            showToast('Erro ao salvar comissão: ' + err.message, 'error');
                          }
                        }}
                        title="Clique para editar a comissão"
                      />
                      <span className="text-[9px] text-slate-400 font-bold">%</span>
                      <Pencil size={9} className="text-slate-300 ml-0.5" />
                    </div>
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
      </>)}

      {/* ═══ ABA: DESPESAS ═══ */}
      {abaAtiva === 'despesas' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <select value={mesSel} onChange={e => setMesSel(e.target.value)}
              className="border border-slate-300 rounded-xl px-4 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-400">
              {Array.from({ length: 12 }, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - i); const v = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; return <option key={v} value={v}>{d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</option>; })}
            </select>
            <button onClick={() => abrirModalDesp()} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 text-sm font-bold">
              <Plus size={16} /> Nova Despesa
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5"><p className="text-[10px] font-bold text-slate-400 uppercase">Total do Mês</p><p className="text-2xl font-black text-slate-800">{fmt(totalDesp)}</p></div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5"><p className="text-[10px] font-bold text-slate-400 uppercase">Total Pago</p><p className="text-2xl font-black text-emerald-600">{fmt(totalDespPago)}</p></div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5"><p className="text-[10px] font-bold text-slate-400 uppercase">Pendente</p><p className="text-2xl font-black text-amber-600">{fmt(totalDesp - totalDespPago)}</p></div>
          </div>

          {loadingDesp ? <div className="text-center py-12 text-slate-400 animate-pulse">Carregando despesas...</div> : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
                  <th className="p-3 text-left">Data</th><th className="p-3 text-left">Descrição</th><th className="p-3 text-left">Tipo</th>
                  <th className="p-3 text-right">Valor</th><th className="p-3 text-right">Pago</th><th className="p-3 text-right">Pendente</th><th className="p-3 text-center">Ações</th>
                </tr></thead>
                <tbody>
                  {despesas.length === 0 ? <tr><td colSpan={7} className="text-center py-10 text-slate-400">Nenhuma despesa neste mês</td></tr> :
                  despesas.map(d => (
                    <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                      <td className="p-2">{new Date(d.data+'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td className="p-2 font-bold text-slate-800">{d.descricao}</td>
                      <td className="p-2"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{d.tipo}</span></td>
                      <td className="p-2 text-right font-bold">{fmt(d.valor)}</td>
                      <td className="p-2 text-right text-emerald-600 font-bold">{fmt(d.valor_pago)}</td>
                      <td className="p-2 text-right text-amber-600 font-bold">{fmt(d.valor_pendente)}</td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => abrirModalDesp(d)} className="p-1 text-blue-500 hover:text-blue-700 rounded hover:bg-blue-50"><Pencil size={14} /></button>
                          <button onClick={() => deletarDesp(d.id)} className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Modal open={modalDesp} onClose={() => setModalDesp(false)} title={despEdit ? 'Editar Despesa' : 'Nova Despesa'}>
            <div className="space-y-4">
              <div><label className="text-sm font-bold text-slate-700 mb-1 block">Data</label>
                <input type="date" value={formDesp.data} onChange={e => setFormDesp({...formDesp, data: e.target.value})} className="w-full border-2 border-slate-100 p-3 rounded-2xl focus:border-emerald-500 outline-none" /></div>
              <div><label className="text-sm font-bold text-slate-700 mb-1 block">Descrição</label>
                <input type="text" value={formDesp.descricao} onChange={e => setFormDesp({...formDesp, descricao: e.target.value.toUpperCase()})} placeholder="Ex: ALUGUEL" className="w-full border-2 border-slate-100 p-3 rounded-2xl focus:border-emerald-500 outline-none" /></div>
              <div><label className="text-sm font-bold text-slate-700 mb-1 block">Tipo</label>
                <select value={formDesp.tipo} onChange={e => setFormDesp({...formDesp, tipo: e.target.value})} className="w-full border-2 border-slate-100 p-3 rounded-2xl focus:border-emerald-500 outline-none bg-white">
                  {TIPOS_DESPESA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-bold text-slate-700 mb-1 block">Valor (R$)</label>
                  <input type="number" step="0.01" value={formDesp.valor} onChange={e => setFormDesp({...formDesp, valor: e.target.value})} className="w-full border-2 border-slate-100 p-3 rounded-2xl focus:border-emerald-500 outline-none" /></div>
                <div><label className="text-sm font-bold text-slate-700 mb-1 block">Valor Pago (R$)</label>
                  <input type="number" step="0.01" value={formDesp.valor_pago} onChange={e => setFormDesp({...formDesp, valor_pago: e.target.value})} className="w-full border-2 border-slate-100 p-3 rounded-2xl focus:border-emerald-500 outline-none" /></div>
              </div>
              <button onClick={salvarDesp} className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 mt-2">
                {despEdit ? 'Salvar Alterações' : 'Criar Despesa'}
              </button>
            </div>
          </Modal>
        </div>
      )}

      {/* ═══ ABA: CUSTOS FIXOS ═══ */}
      {abaAtiva === 'custos_fixos' && (
        <div className="space-y-6 max-w-2xl">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <Info size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800"><strong>Importante:</strong> Alterar esses valores recalcula automaticamente os preços sugeridos na aba Precificação.</p>
          </div>

          {[{
            campo: 'custo_fixo_por_atendimento', label: 'Custo fixo por atendimento (R$)', prefixo: 'R$', step: '0.01',
            desc: 'Representa aluguel + contas fixas dividido pela média de atendimentos mensais'
          }, {
            campo: 'taxa_maquininha_pct', label: 'Taxa da maquininha (%)', sufixo: '%', step: '0.1',
            desc: 'Percentual descontado em pagamentos por cartão. Padrão: 5%'
          }, {
            campo: 'margem_lucro_desejada_pct', label: 'Margem de lucro desejada (%)', sufixo: '%', step: '0.1',
            desc: 'Meta percentual de lucro sobre o faturamento bruto'
          }, {
            campo: 'qtd_atendimentos_mes', label: 'Qtd. atendimentos / mês', step: '1',
            desc: 'Média de atendimentos mensais para rateio dos custos fixos'
          }].map(item => (
            <div key={item.campo} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <label className="text-sm font-bold text-slate-700 block mb-1">{item.label}</label>
              <p className="text-xs text-slate-400 mb-3">{item.desc}</p>
              <div className="flex items-center gap-2">
                {item.prefixo && <span className="text-slate-400 text-sm font-bold">{item.prefixo}</span>}
                <input type="number" step={item.step}
                  className="border-2 border-slate-200 rounded-xl px-4 py-3 text-lg font-black text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 w-40 transition-all"
                  value={config[item.campo]}
                  onChange={e => { setConfig(prev => ({ ...prev, [item.campo]: e.target.value })); setConfigAlterada(true); }}
                  onBlur={async () => {
                    try {
                      await supabase.from('configuracoes').update({ [item.campo]: Number(config[item.campo]) }).eq('salao_id', salaoId);
                      showToast('✓ Salvo', 'success');
                    } catch { showToast('Erro ao salvar', 'error'); }
                  }}
                />
                {item.sufixo && <span className="text-slate-400 text-sm font-bold">{item.sufixo}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
