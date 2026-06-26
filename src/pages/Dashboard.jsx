import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import useDashboardProtection from '../hooks/useDashboardProtection';
import DashboardLockOverlay from '../components/DashboardLockOverlay';
import {
  Lock, AlertCircle, ShieldCheck, CalendarDays,
  Sparkles, Bookmark, CheckCircle, TrendingUp,
  DollarSign, Activity, Users, Package, HelpCircle
} from 'lucide-react';
import InfoTooltip from '../components/Tooltip';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LabelList,
  ReferenceLine
} from 'recharts';

// ─── Utilitários ───
const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtK = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1000) return `R$${(n / 1000).toFixed(1)}k`;
  return `R$${n.toFixed(0)}`;
};
const MESES_PT = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// ─── Cores idênticas à planilha ───
const COR_BARRA_PRINCIPAL = '#e84c3d';
const COR_BARRA_LUCRO     = '#c0392b';
const COR_NEGATIVO        = '#7f1d1d';
const COR_POSITIVO        = '#e84c3d';
const COR_FUNCIONARIA     = '#e84c3d';
const COR_LARANJA         = '#f97316';
const FUNDO_HEADER        = '#1e2433';
const FUNDO_CARD          = '#1e2433';

// ─── Tooltip customizado (escuro) ───
const TooltipMoeda = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-sky-500 border border-blue-600 shadow-xl rounded-xl p-3 text-xs">
      <p className="font-bold text-gray-500 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color || '#e2e8f0' }} className="font-bold">
          {entry.name}: {typeof entry.value === 'number' && Math.abs(entry.value) > 10
            ? fmt(entry.value)
            : entry.value}
        </p>
      ))}
    </div>
  );
};

// ─── Label que mostra quantidade acima das barras ───
const LabelQtd = ({ x, y, width, value }) => {
  if (!value) return null;
  return (
    <text x={x + width / 2} y={y - 6} textAnchor="middle"
      fill="#e2e8f0" fontSize={10} fontWeight="bold">
      {value}
    </text>
  );
};

// ─── Label de valor nas barras horizontais ───
const LabelValorH = ({ x, y, width, height, value }) => {
  if (!value) return null;
  const positivo = Number(value) >= 0;
  const px = positivo ? x + width + 4 : x + width - 4;
  return (
    <text x={px} y={y + height / 2 + 4} textAnchor={positivo ? 'start' : 'end'}
      fill={positivo ? '#166534' : '#991b1b'} fontSize={10} fontWeight="bold">
      {fmt(value)}
    </text>
  );
};

// ─── KPI Card ───
const KpiCard = ({ label, value, sub, cor = 'text-gray-800' }) => (
  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-xl font-black ${cor} truncate`}>{value}</p>
    {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
  </div>
);

// ─── Explicação de gráfico (reutilizável) ───
const ExplicacaoGrafico = ({ texto, dica }) => (
  <div className="mb-4 space-y-2">
    <div className="flex items-start gap-2 bg-sky-50 rounded-lg p-3">
      <span className="text-lg flex-shrink-0">💡</span>
      <p className="text-gray-600 text-xs leading-relaxed">{texto}</p>
    </div>
    {dica && (
      <div className="flex items-start gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
        <span className="text-orange-400 flex-shrink-0 text-xs font-bold">📌</span>
        <p className="text-orange-300 text-xs leading-relaxed">{dica}</p>
      </div>
    )}
  </div>
);

// ════════════════════════════════════════════════════════════════
export default function Dashboard({ salaoId }) {
  const { showToast } = useToast();

  // ─── Proteção Inteligente ───
  const { isLocked, protectionEnabled, loading: protectionLoading, unlock } = useDashboardProtection(salaoId);

  // ─── Filtros (igual à planilha) ───
  const [mesSelecionado, setMesSelecionado] = useState('');
  const [meses, setMeses] = useState([]);
  const [anoHomecare, setAnoHomecare] = useState(new Date().getFullYear());

  // ─── Dados ───
  const [loading, setLoading] = useState(true);
  const [fechamento, setFechamento] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [rendimento, setRendimento] = useState([]);
  const [homecareMensal, setHomecareMensal] = useState([]);
  const [homecareDados, setHomecareDados] = useState({ lucro: 0, pendencia: 0, vendas: 0, total: 0 });
  const [despesasDados, setDespesasDados] = useState({ total: 0 });
  const [custosFixosDados, setCustosFixosDados] = useState({ total: 0 });
  const [gastosPessoais, setGastosPessoais] = useState(0);
  const [salariosFixos, setSalariosFixos] = useState(0);
  const [fechamentoExiste, setFechamentoExiste] = useState(false);
  const [salvandoFechamento, setSalvandoFechamento] = useState(false);
  const [confirmacao, setConfirmacao] = useState(null);

  // ─── Montar lista de meses ───
  useEffect(() => {
    const arr = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      arr.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    setMeses(arr);
    setMesSelecionado(arr[0]);
  }, []);

  // ─── Carregar dados ───
  useEffect(() => {
    if (!salaoId || !mesSelecionado || isLocked) return;
    carregarDados();
  }, [salaoId, mesSelecionado, isLocked]);

  // Recarregar homecare quando ano mudar
  useEffect(() => {
    if (!salaoId || isLocked) return;
    carregarHomecarePorMes();
  }, [salaoId, anoHomecare, isLocked]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [ano, mes] = mesSelecionado.split('-');
      const inicioMes = `${ano}-${mes}-01`;
      const fimMes = new Date(Number(ano), Number(mes), 0).toISOString().split('T')[0];

      const [fechRes, rankRes, rendRes, hcRes, despRes, cfixRes, gpRes, profRes, fecRes] = await Promise.all([
        supabase.from('fechamento_mensal')
          .select('mes, faturamento_bruto, lucro_real, lucro_possivel, total_atendimentos, total_pendente')
          .eq('salao_id', salaoId)
          .order('mes', { ascending: true })
          .limit(12),

        supabase.from('ranking_procedimentos')
          .select('procedimento, receita_total, lucro_total, quantidade, mes')
          .eq('salao_id', salaoId)
          .gte('mes', inicioMes).lte('mes', fimMes)
          .order('receita_total', { ascending: false }),

        supabase.from('rendimento_por_profissional')
          .select('profissional, atendimentos, rendimento_bruto, mes')
          .eq('salao_id', salaoId)
          .gte('mes', inicioMes).lte('mes', fimMes)
          .order('rendimento_bruto', { ascending: false }),

        supabase.from('homecare')
          .select('lucro, valor_pendente, valor_venda')
          .eq('salao_id', salaoId)
          .gte('data', inicioMes).lte('data', fimMes),

        supabase.from('despesas')
          .select('valor')
          .eq('salao_id', salaoId)
          .gte('data', inicioMes).lte('data', fimMes),

        supabase.from('custos_fixos_itens')
          .select('valor_mensal')
          .eq('salao_id', salaoId)
          .eq('ativo', true),

        supabase.from('gastos_pessoais')
          .select('valor')
          .eq('salao_id', salaoId),

        supabase.from('profissionais')
          .select('salario_fixo')
          .eq('salao_id', salaoId).eq('ativo', true),

        supabase.from('fechamentos')
          .select('id')
          .eq('salao_id', salaoId).eq('mes', inicioMes).maybeSingle(),
      ]);

      setFechamento(fechRes.data ?? []);
      setRanking(rankRes.data ?? []);
      setRendimento(rendRes.data ?? []);

      const hc = hcRes.data ?? [];
      setHomecareDados({
        total: hc.reduce((a, v) => a + Number(v.valor_venda || 0), 0),
        lucro: hc.reduce((a, v) => a + Number(v.lucro || 0), 0),
        pendencia: hc.reduce((a, v) => a + Number(v.valor_pendente || 0), 0),
        vendas: hc.length,
      });

      setDespesasDados({ total: (despRes.data ?? []).reduce((a, v) => a + Number(v.valor || 0), 0) });
      setCustosFixosDados({ total: (cfixRes.data ?? []).reduce((a, v) => a + Number(v.valor_mensal || 0), 0) });
      setGastosPessoais((gpRes.data ?? []).reduce((a, v) => a + Number(v.valor || 0), 0));
      setSalariosFixos((profRes.data ?? []).reduce((a, v) => a + Number(v.salario_fixo || 0), 0));
      setFechamentoExiste(!!fecRes.data);

      await carregarHomecarePorMes();
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const carregarHomecarePorMes = async () => {
    const { data } = await supabase
      .from('homecare')
      .select('data, valor_venda, lucro')
      .eq('salao_id', salaoId)
      .gte('data', `${anoHomecare}-01-01`)
      .lte('data', `${anoHomecare}-12-31`);

    if (!data) return;
    const porMes = {};
    data.forEach(r => {
      const m = new Date(r.data + 'T12:00:00').getMonth() + 1;
      if (!porMes[m]) porMes[m] = { venda: 0, lucro: 0 };
      porMes[m].venda += Number(r.valor_venda || 0);
      porMes[m].lucro += Number(r.lucro || 0);
    });
    const arr = Array.from({ length: 12 }, (_, i) => ({
      mes: MESES_PT[i + 1],
      venda: porMes[i + 1]?.venda || 0,
      lucro: porMes[i + 1]?.lucro || 0,
    }));
    setHomecareMensal(arr);
  };

  // ─── Dados derivados ───
  const mesAtual = useMemo(() => {
    if (!fechamento.length) return null;
    const [ano, mes] = mesSelecionado.split('-');
    const target = `${ano}-${mes}-01`;
    return fechamento.find(f => f.mes === target) || fechamento[fechamento.length - 1];
  }, [fechamento, mesSelecionado]);

  // Gráfico 1: Valor faturado bruto mensal (barras verticais com qtd em cima)
  const dadosFaturamento = useMemo(() =>
    fechamento.map(f => {
      const d = new Date(f.mes + 'T12:00:00');
      return {
        mes: MESES_PT[d.getMonth() + 1],
        faturamento: Number(f.faturamento_bruto) || 0,
        lucro: Number(f.lucro_real) || 0,
        qtd: Number(f.total_atendimentos) || 0,
      };
    }), [fechamento]);

  // Gráfico 2: Lucro possível por procedimento (horizontal, ordenado crescente)
  const dadosLucroPossivel = useMemo(() =>
    [...ranking]
      .sort((a, b) => Number(a.receita_total) - Number(b.receita_total))
      .map(r => ({
        nome: r.procedimento?.length > 14 ? r.procedimento.substring(0, 14) + '...' : r.procedimento,
        nomeCompleto: r.procedimento,
        valor: Number(r.receita_total) || 0,
        lucro: Number(r.lucro_total) || 0,
      })), [ranking]);

  // Gráfico 3: Lucro real por procedimento (pode ter negativos)
  const dadosLucroReal = useMemo(() =>
    [...ranking]
      .sort((a, b) => Number(a.lucro_total) - Number(b.lucro_total))
      .map(r => ({
        nome: r.procedimento?.length > 14 ? r.procedimento.substring(0, 14) + '...' : r.procedimento,
        nomeCompleto: r.procedimento,
        valor: Number(r.lucro_total) || 0,
      })), [ranking]);

  // Totais para Lucro Possível vs Real
  const totalPossivel = useMemo(() => fechamento.reduce((a, f) => a + Number(f.lucro_possivel || 0), 0), [fechamento]);
  const totalReal = useMemo(() => fechamento.reduce((a, f) => a + Number(f.lucro_real || 0), 0), [fechamento]);
  const totalFaturamento = useMemo(() => fechamento.reduce((a, f) => a + Number(f.faturamento_bruto || 0), 0), [fechamento]);

  // Gráfico 4: Rendimento por funcionária
  const dadosRendimento = useMemo(() =>
    [...rendimento].sort((a, b) => Number(a.rendimento_bruto) - Number(b.rendimento_bruto))
      .map(r => ({
        nome: r.profissional,
        valor: Number(r.rendimento_bruto) || 0,
      })), [rendimento]);

  const totalHomecarAno = useMemo(() => homecareMensal.reduce((a, m) => a + m.venda, 0), [homecareMensal]);

  // ─── Saúde financeira ───
  const resultado = useMemo(() => {
    const lucro = Number(mesAtual?.lucro_real) || 0;
    return lucro + homecareDados.lucro - custosFixosDados.total - gastosPessoais - salariosFixos;
  }, [mesAtual, homecareDados, despesasDados, gastosPessoais, salariosFixos]);

  // ────────────────────────────────────────────────────────────
  // LOADING da proteção (enquanto busca config do banco)
  // ────────────────────────────────────────────────────────────
  if (protectionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 to-blue-800">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-3 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-300 text-sm font-medium uppercase">Carregando Dashboard...</p>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // TELA DE BLOQUEIO (PIN automático via hook)
  // ────────────────────────────────────────────────────────────
  if (isLocked) {
    return <DashboardLockOverlay onUnlock={unlock} salaoId={salaoId} />;
  }

  // ────────────────────────────────────────────────────────────
  // DASHBOARD PRINCIPAL
  // ────────────────────────────────────────────────────────────
  return (
    <div className="p-5 bg-gray-50 min-h-screen font-sans">

      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-gray-500" />
          <h1 className="text-2xl font-black text-gray-800 uppercase">Painel Financeiro</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
            <CalendarDays size={14} className="text-gray-500" />
            <select value={mesSelecionado} onChange={e => setMesSelecionado(e.target.value)}
              className="border-0 bg-transparent outline-none text-sm font-medium text-gray-600 cursor-pointer">
              {meses.map(m => (
                <option key={m} value={m}>
                  {new Date(m + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </option>
              ))}
            </select>
          </div>
          {protectionEnabled && (
            <button onClick={() => window.location.reload()}
              className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200 text-gray-500 font-bold hover:bg-gray-50 text-sm shadow-sm">
              <Lock size={14} /> Bloquear
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-3" />
          <span className="text-gray-500 font-medium">Carregando dados...</span>
        </div>
      ) : fechamento.length === 0 && (!mesAtual || Number(mesAtual.faturamento_bruto) === 0) ? (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-center mt-6 animate-fadeIn">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
            <Activity size={32} className="text-blue-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight mb-3">Ainda não há dados financeiros</h2>
          <p className="text-gray-500 max-w-md mx-auto mb-8 leading-relaxed font-medium">
            O painel financeiro é construído automaticamente com base nos seus agendamentos executados. Comece a registrar agendamentos na agenda para ver seus resultados!
          </p>
        </div>
      ) : (<>

        {/* ════════════════════════════════════════════════════
            BLOCO 1 — KPIs PRINCIPAIS (igual cabeçalho da planilha)
        ════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 col-span-1 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total Faturado</p>
              <InfoTooltip content="Soma de todos os valores cobrados dos clientes em atendimentos executados.">
                <HelpCircle size={12} className="text-gray-400 hover:text-sky-500 transition-colors" />
              </InfoTooltip>
            </div>
            <p className="text-3xl font-black text-gray-800 mt-1">{fmt(totalFaturamento)}</p>
            <p className="text-[10px] text-gray-500 mt-1">Acumulado dos {fechamento.length} meses</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Lucro Possível</p>
              <InfoTooltip content="Quanto sobraria se não houvesse taxa de maquininha. Incentive pagamento via PIX para aumentar este valor.">
                <HelpCircle size={12} className="text-gray-400 hover:text-sky-500 transition-colors" />
              </InfoTooltip>
            </div>
            <p className="text-2xl font-black text-sky-600 mt-1">{fmt(totalPossivel)}</p>
            <p className="text-[10px] text-gray-500 mt-1">Sem taxa maquininha</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Lucro Real</p>
              <InfoTooltip content="Quanto realmente sobrou depois de taxas, custos fixos e custos variáveis de cada procedimento.">
                <HelpCircle size={12} className="text-gray-400 hover:text-sky-500 transition-colors" />
              </InfoTooltip>
            </div>
            <p className={`text-2xl font-black mt-1 ${totalReal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {fmt(totalReal)}
            </p>
            <p className="text-[10px] text-gray-500 mt-1">Após todos os custos</p>
          </div>
          <div className={`rounded-2xl border-2 shadow-sm p-5 ${resultado >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              {resultado >= 0
                ? <ShieldCheck size={14} className="text-emerald-600" />
                : <AlertCircle size={14} className="text-red-600" />}
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Saúde</p>
              <InfoTooltip content="Resultado geral: Lucro Real + HomeCare − Despesas − Salários − Retiradas pessoais." position="bottom">
                <HelpCircle size={12} className="text-gray-400 hover:text-sky-500 transition-colors" />
              </InfoTooltip>
            </div>
            <p className={`text-2xl font-black ${resultado >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {resultado >= 0 ? 'Saudável' : 'No vermelho'}
            </p>
            <p className={`text-sm font-bold mt-1 ${resultado >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {fmt(resultado)}
            </p>
          </div>
        </div>

        {/* Alertas de pendência */}
        {Number(mesAtual?.total_pendente) > 0 && (
          <div className="mb-6 bg-sky-50 border border-sky-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle size={16} className="text-sky-600 flex-shrink-0" />
            <p className="text-sm font-bold text-blue-800">
              {fmt(mesAtual.total_pendente)} em atendimentos pendentes este mês
            </p>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            GRÁFICO 1 — VALOR FATURADO BRUTO (barras mensais)
            Idêntico à planilha: qtd em cima, valor embaixo
        ════════════════════════════════════════════════════ */}
        <div className="rounded-2xl shadow-sm mb-6 overflow-hidden" style={{ backgroundColor: FUNDO_CARD }}>
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">
              Valor Faturado Bruto
            </h2>
          </div>
          <div className="p-6">
            <ExplicacaoGrafico
              texto="Quanto seu salão cobrou em cada mês. O número acima de cada barra é a quantidade de atendimentos realizados."
              dica="Meses com muitos atendimentos mas valor baixo indicam serviços muito baratos. Hora de revisar preços."
            />
            {dadosFaturamento.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosFaturamento} margin={{ top: 30, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2d3748" />
                  <XAxis dataKey="mes" axisLine={false} tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false}
                    tick={{ fill: '#475569', fontSize: 10 }}
                    tickFormatter={fmtK} />
                  <RechartsTooltip content={<TooltipMoeda />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar dataKey="faturamento" name="Faturamento" fill={COR_BARRA_PRINCIPAL}
                    radius={[4, 4, 0, 0]} maxBarSize={55}>
                    <LabelList dataKey="qtd" content={<LabelQtd />} />
                  </Bar>
                  <Bar dataKey="lucro" name="Lucro Real" fill={COR_BARRA_LUCRO}
                    radius={[4, 4, 0, 0]} maxBarSize={55} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
                Sem dados de faturamento
              </div>
            )}
            <div className="flex items-center gap-6 mt-2 justify-center">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COR_BARRA_PRINCIPAL }} />
                <span className="text-[11px] font-bold text-gray-500 uppercase">Faturamento Bruto</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COR_BARRA_LUCRO }} />
                <span className="text-[11px] font-bold text-gray-500 uppercase">Lucro Real</span>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════
            GRÁFICOS 2 e 3 — PROCEDIMENTOS (lado a lado)
            Igual à planilha: Lucro Possível | Lucro Real
        ════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Lucro Possível por procedimento */}
          <div className="rounded-2xl shadow-sm overflow-hidden" style={{ backgroundColor: FUNDO_CARD }}>
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">
                Procedimentos Mais Rentáveis
              </h2>
            </div>
            <div className="p-5">
              <ExplicacaoGrafico
                texto="Quanto cada serviço pode gerar de lucro se a cliente pagar no pix ou dinheiro. Quanto maior a barra, mais rentável o serviço."
                dica="Os serviços no topo são os que você deve priorizar e divulgar mais."
              />
              {dadosLucroPossivel.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(260, dadosLucroPossivel.length * 34)}>
                  <BarChart data={dadosLucroPossivel} layout="vertical"
                    margin={{ top: 0, right: 80, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#2d3748" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="nome" type="category" axisLine={false} tickLine={false}
                      tick={{ fill: '#e2e8f0', fontSize: 11, fontWeight: '600' }} width={110} />
                    <RechartsTooltip content={<TooltipMoeda />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="valor" name="Lucro Possível" fill={COR_POSITIVO}
                      radius={[0, 4, 4, 0]} barSize={20}>
                      <LabelList dataKey="valor" position="right"
                        formatter={v => fmt(v)}
                        style={{ fill: '#e2e8f0', fontSize: 10, fontWeight: 'bold' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
                  Sem dados neste mês
                </div>
              )}
            </div>
          </div>

          {/* Lucro Real por procedimento (pode ter negativos) */}
          <div className="rounded-2xl shadow-sm overflow-hidden" style={{ backgroundColor: FUNDO_CARD }}>
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">
                Lucro Real por Serviço
              </h2>
            </div>
            <div className="p-5">
              <ExplicacaoGrafico
                texto="O que cada serviço realmente sobrou para o caixa após descontar todos os custos. ATENÇÃO: barras para a esquerda = prejuízo."
                dica="Serviços no vermelho (prejuízo) precisam ter o preço revisado urgentemente."
              />
              {dadosLucroReal.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(260, dadosLucroReal.length * 34)}>
                  <BarChart data={dadosLucroReal} layout="vertical"
                    margin={{ top: 0, right: 80, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#2d3748" />
                    <XAxis type="number" hide />
                    <ReferenceLine x={0} stroke="#475569" strokeWidth={1} />
                    <YAxis dataKey="nome" type="category" axisLine={false} tickLine={false}
                      tick={{ fill: '#e2e8f0', fontSize: 11, fontWeight: '600' }} width={110} />
                    <RechartsTooltip content={<TooltipMoeda />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="valor" name="Lucro Real" barSize={20} radius={[0, 4, 4, 0]}>
                      {dadosLucroReal.map((entry, index) => (
                        <Cell key={`cell-${index}`}
                          fill={entry.valor >= 0 ? COR_POSITIVO : COR_NEGATIVO} />
                      ))}
                      <LabelList dataKey="valor" position="right"
                        formatter={v => fmt(v)}
                        style={{ fill: '#e2e8f0', fontSize: 10, fontWeight: 'bold' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
                  Sem dados neste mês
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════
            GRÁFICO 4 — LUCRO POSSÍVEL vs LUCRO REAL (totais)
            Duas barras grandes lado a lado
        ════════════════════════════════════════════════════ */}
        <div className="rounded-2xl shadow-sm mb-6 overflow-hidden" style={{ backgroundColor: FUNDO_CARD }}>
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">
              Lucro Possível vs Lucro Real
            </h2>
          </div>
          <div className="p-6">
            <ExplicacaoGrafico
              texto="Lucro Possível é o que você ganharia se todos pagassem no pix. Lucro Real é o que entrou de fato no caixa após a maquininha."
              dica="Quanto maior a diferença entre as duas barras, mais seus clientes estão pagando no cartão. Incentive o pagamento no pix."
            />
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={[
                  { nome: 'Lucro Possível', valor: totalPossivel },
                  { nome: 'Lucro Real', valor: totalReal },
                ]}
                margin={{ top: 30, right: 40, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2d3748" />
                <XAxis dataKey="nome" axisLine={false} tickLine={false}
                  tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false}
                  tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={fmtK} />
                <RechartsTooltip content={<TooltipMoeda />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="valor" maxBarSize={120} radius={[6, 6, 0, 0]}>
                  <Cell fill={COR_LARANJA} />
                  <Cell fill={COR_BARRA_PRINCIPAL} />
                  <LabelList dataKey="valor" position="top"
                    formatter={v => fmt(v)}
                    style={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════
            GRÁFICO 5 — RENDIMENTO LÍQUIDO POR PROFISSIONAL
        ════════════════════════════════════════════════════ */}
        <div className="rounded-2xl shadow-sm mb-6 overflow-hidden" style={{ backgroundColor: FUNDO_CARD }}>
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">
              Rendimento Líquido por Profissional
            </h2>
          </div>
          <div className="p-6">
            <ExplicacaoGrafico
              texto="Quanto cada profissional gerou de faturamento para o salão no período selecionado."
              dica="Use esse gráfico para reconhecer as profissionais mais produtivas e identificar quem precisa de apoio."
            />
            {dadosRendimento.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dadosRendimento} margin={{ top: 30, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2d3748" />
                  <XAxis dataKey="nome" axisLine={false} tickLine={false}
                    tick={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false}
                    tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={fmtK} />
                  <RechartsTooltip content={<TooltipMoeda />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar dataKey="valor" name="Rendimento" fill={COR_FUNCIONARIA}
                    radius={[4, 4, 0, 0]} maxBarSize={60}>
                    <LabelList dataKey="valor" position="top"
                      formatter={v => fmt(v)}
                      style={{ fill: '#e2e8f0', fontSize: 10, fontWeight: 'bold' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
                Sem dados de rendimento neste mês
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════
            GRÁFICO 6 — VENDA HOME CARE
        ════════════════════════════════════════════════════ */}
        <div className="rounded-2xl shadow-sm mb-6 overflow-hidden" style={{ backgroundColor: FUNDO_CARD }}>
          <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200">
            <div>
              <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">
                Venda de Produtos (Home Care)
              </h2>
            </div>
            <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
              {[new Date().getFullYear(), new Date().getFullYear() - 1].map(ano => (
                <button key={ano} onClick={() => setAnoHomecare(ano)}
                  className={`px-3 py-1.5 rounded text-xs font-black transition-all ${anoHomecare === ano
                    ? 'bg-sky-400 text-gray-800'
                    : 'text-gray-600 hover:text-gray-800'}`}>
                  {ano}
                </button>
              ))}
            </div>
          </div>
          <div className="p-6">
            <ExplicacaoGrafico
              texto="Receita gerada com a venda de produtos para as clientes levarem para casa. Selecione o ano com os botões acima."
              dica="Produtos em casa fidelizam a cliente e aumentam o ticket médio sem ocupar horário na agenda."
            />
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-500 uppercase">
                Venda Home Care {anoHomecare}
              </p>
              <p className="text-2xl font-black text-gray-800">{fmt(totalHomecarAno)}</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-3">Venda / Pendência por Mês</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={homecareMensal} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2d3748" />
                    <XAxis dataKey="mes" axisLine={false} tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false}
                      tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={fmtK} />
                    <RechartsTooltip content={<TooltipMoeda />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="venda" name="Venda" fill={COR_LARANJA}
                      radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-3">Lucro por Mês</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={homecareMensal} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2d3748" />
                    <XAxis dataKey="mes" axisLine={false} tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false}
                      tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={fmtK} />
                    <RechartsTooltip content={<TooltipMoeda />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="lucro" name="Lucro" fill={COR_BARRA_PRINCIPAL}
                      radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════
            FECHAR MÊS
        ════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-md">
                <Bookmark size={18} className="text-gray-800" />
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-800">Fechamento do Mês</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {fechamentoExiste
                    ? 'Este mês já foi fechado. Você pode atualizar os dados.'
                    : 'Salve uma foto dos resultados deste mês.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {fechamentoExiste && (
                <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 font-bold text-xs">
                  <CheckCircle size={14} /> Fechado
                </div>
              )}
              <button
                onClick={() => {
                  const [ano, mes] = mesSelecionado.split('-');
                  const mesLabel = new Date(`${ano}-${mes}-01`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                  const acao = fechamentoExiste ? 'ATUALIZAR' : 'FECHAR';
                  setConfirmacao({
                    title: `${acao} MÊS`,
                    message: `DESEJA ${acao} O MÊS DE ${mesLabel}?\n\nISSO SALVARÁ UMA FOTO DOS RESULTADOS FINANCEIROS ATUAIS.`,
                    confirmLabel: acao,
                    tone: 'warning',
                    onConfirm: async () => {
                      setConfirmacao(null);
                      setSalvandoFechamento(true);
                      try {
                        const faturamento = Number(mesAtual?.faturamento_bruto) || 0;
                        const lucro = Number(mesAtual?.lucro_real) || 0;
                        const possivel = Number(mesAtual?.lucro_possivel) || lucro;
                        const atendimentos = Number(mesAtual?.total_atendimentos) || 0;
                        const pendente = Number(mesAtual?.total_pendente) || 0;
                        const resultadoFinal = lucro + homecareDados.lucro - custosFixosDados.total - gastosPessoais - salariosFixos;

                        const payload = {
                          salao_id: salaoId,
                          mes: `${ano}-${mes}-01`,
                          faturamento_bruto: faturamento,
                          lucro_liquido: lucro,
                          lucro_possivel: possivel,
                          total_atendimentos: atendimentos,
                          total_pendente: pendente,
                          total_despesas: custosFixosDados.total,
                          total_gastos_pessoais: gastosPessoais,
                          lucro_homecare: homecareDados.lucro,
                          resultado_final: resultadoFinal,
                        };

                        const { error } = await supabase
                          .from('fechamentos')
                          .upsert(payload, { onConflict: 'salao_id,mes' });

                        if (error) throw error;

                        setFechamentoExiste(true);
                        showToast(`MÊS DE ${mesLabel.toUpperCase()} ${fechamentoExiste ? 'ATUALIZADO' : 'FECHADO'} COM SUCESSO!`, 'success');
                      } catch (err) {
                        console.error('Erro ao fechar mês:', err);
                        showToast(`ERRO AO ${acao} O MÊS: ${err.message}`, 'error');
                      } finally {
                        setSalvandoFechamento(false);
                      }
                    },
                  });
                }}
                disabled={salvandoFechamento}
                className={`px-6 py-3 rounded-xl font-bold transition-all shadow-lg text-sm disabled:opacity-50 ${
                  fechamentoExiste
                    ? 'bg-gradient-to-r from-blue-500 to-orange-500 text-white hover:opacity-90'
                    : 'bg-gradient-to-r from-sky-500 to-sky-600 text-white hover:opacity-90'
                }`}
              >
                {salvandoFechamento
                  ? 'Salvando...'
                  : fechamentoExiste
                    ? '🔄 Atualizar Fechamento'
                    : '📸 Fechar Este Mês'}
              </button>
            </div>
          </div>

          {/* Resumo do que será salvo */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Faturamento', Number(mesAtual?.faturamento_bruto) || 0, 'Total cobrado dos clientes.'],
              ['Lucro Líquido', Number(mesAtual?.lucro_real) || 0, 'Valor restante após taxas, comissões e custos.'],
              ['Custo Fixo', custosFixosDados.total, 'Total dos custos fixos mensais cadastrados em Precificação.'],
              ['Resultado', (Number(mesAtual?.lucro_real) || 0) + homecareDados.lucro - custosFixosDados.total - gastosPessoais - salariosFixos, 'Lucro após despesas, salários e retiradas.'],
            ].map(([label, val, tip]) => (
              <div key={label} className="bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
                <div className="flex items-center gap-1">
                  <p className="text-[9px] font-bold text-gray-500 uppercase">{label}</p>
                  <InfoTooltip content={tip} position="top">
                    <HelpCircle size={10} className="text-gray-400 hover:text-sky-500 transition-colors" />
                  </InfoTooltip>
                </div>
                <p className={`text-sm font-black ${Number(val) >= 0 ? 'text-gray-600' : 'text-red-600'}`}>{fmt(val)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center text-[10px] text-gray-600 font-medium">
          Dados em tempo real · Salão Secreto
        </div>

        <ConfirmModal
          open={!!confirmacao}
          title={confirmacao?.title || ''}
          message={confirmacao?.message || ''}
          confirmLabel={confirmacao?.confirmLabel || 'CONFIRMAR'}
          tone={confirmacao?.tone || 'warning'}
          onCancel={() => setConfirmacao(null)}
          onConfirm={confirmacao?.onConfirm || (() => setConfirmacao(null))}
        />

      </>)}
    </div>
  );
}
