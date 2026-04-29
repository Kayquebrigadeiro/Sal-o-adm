import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import {
  Lock, AlertCircle, ShieldCheck, CalendarDays,
  Sparkles, Bookmark, CheckCircle, TrendingUp,
  DollarSign, Activity, Users, Package
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, LabelList,
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
const COR_BARRA_PRINCIPAL = '#e84c3d';   // vermelho/laranja da planilha
const COR_BARRA_LUCRO     = '#c0392b';   // vermelho mais escuro
const COR_NEGATIVO        = '#922b21';   // vermelho escuro (prejuízo)
const COR_POSITIVO        = '#e84c3d';
const COR_FUNCIONARIA     = '#e84c3d';
const FUNDO_HEADER        = '#1a2744';   // azul escuro dos headers

// ─── Tooltip customizado ───
const TooltipMoeda = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 shadow-xl rounded-xl p-3 text-xs">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color || '#333' }} className="font-bold">
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
      fill="#374151" fontSize={10} fontWeight="bold">
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
const KpiCard = ({ label, value, sub, cor = 'text-slate-800' }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-xl font-black ${cor} truncate`}>{value}</p>
    {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
  </div>
);

// ════════════════════════════════════════════════════════════════
export default function Dashboard({ salaoId }) {

  // ─── PIN ───
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');

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
  const [gastosPessoais, setGastosPessoais] = useState(0);
  const [salariosFixos, setSalariosFixos] = useState(0);
  const [fechamentoExiste, setFechamentoExiste] = useState(false);
  const [salvandoFechamento, setSalvandoFechamento] = useState(false);

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
    if (!salaoId || !mesSelecionado || !unlocked) return;
    carregarDados();
  }, [salaoId, mesSelecionado, unlocked]);

  // Recarregar homecare quando ano mudar
  useEffect(() => {
    if (!salaoId || !unlocked) return;
    carregarHomecarePorMes();
  }, [salaoId, anoHomecare, unlocked]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [ano, mes] = mesSelecionado.split('-');
      const inicioMes = `${ano}-${mes}-01`;
      const fimMes = new Date(Number(ano), Number(mes), 0).toISOString().split('T')[0];

      const [fechRes, rankRes, rendRes, hcRes, despRes, gpRes, profRes, fecRes] = await Promise.all([
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
    return lucro + homecareDados.lucro - despesasDados.total - gastosPessoais - salariosFixos;
  }, [mesAtual, homecareDados, despesasDados, gastosPessoais, salariosFixos]);

  // ────────────────────────────────────────────────────────────
  // TELA DE BLOQUEIO
  // ────────────────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/10 w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-amber-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Lock size={28} />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Painel Financeiro</h2>
          <p className="text-slate-400 mb-8 text-sm">Acesso restrito à gestão financeira.</p>
          <form onSubmit={e => { e.preventDefault(); if (pin === (import.meta.env.VITE_DASHBOARD_PIN || '8239')) setUnlocked(true); else { alert('PIN incorreto'); setPin(''); } }}>
            <input
              type="password" maxLength={4} placeholder="PIN"
              className="w-full text-center text-4xl tracking-[0.5em] font-black bg-white/10 border border-white/20 text-white rounded-xl py-4 outline-none focus:ring-2 focus:ring-rose-500 mb-4"
              value={pin} onChange={e => setPin(e.target.value)} autoFocus
            />
            <button type="submit" className="w-full bg-gradient-to-r from-rose-500 to-amber-500 text-white py-4 rounded-xl font-bold hover:opacity-90 transition-all shadow-xl">
              Desbloquear
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // DASHBOARD PRINCIPAL
  // ────────────────────────────────────────────────────────────
  return (
    <div className="p-5 bg-slate-50 min-h-screen font-sans">

      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-rose-400" />
          <h1 className="text-2xl font-black text-slate-800 uppercase">Painel Financeiro</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
            <CalendarDays size={14} className="text-slate-400" />
            <select value={mesSelecionado} onChange={e => setMesSelecionado(e.target.value)}
              className="border-0 bg-transparent outline-none text-sm font-medium text-slate-700 cursor-pointer">
              {meses.map(m => (
                <option key={m} value={m}>
                  {new Date(m + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </option>
              ))}
            </select>
          </div>
          <button onClick={() => { setUnlocked(false); setPin(''); }}
            className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 text-sm shadow-sm">
            <Lock size={14} /> Bloquear
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-rose-400 border-t-transparent rounded-full animate-spin mr-3" />
          <span className="text-slate-400 font-medium">Carregando dados...</span>
        </div>
      ) : (<>

        {/* ════════════════════════════════════════════════════
            BLOCO 1 — KPIs PRINCIPAIS (igual cabeçalho da planilha)
        ════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 col-span-2 lg:col-span-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Faturado</p>
            <p className="text-3xl font-black text-slate-800 mt-1">{fmt(totalFaturamento)}</p>
            <p className="text-[10px] text-slate-400 mt-1">Acumulado dos {fechamento.length} meses</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lucro Possível</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{fmt(totalPossivel)}</p>
            <p className="text-[10px] text-slate-400 mt-1">Sem taxa maquininha</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lucro Real</p>
            <p className={`text-2xl font-black mt-1 ${totalReal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {fmt(totalReal)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Após todos os custos</p>
          </div>
          <div className={`rounded-2xl border-2 shadow-sm p-5 ${resultado >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              {resultado >= 0
                ? <ShieldCheck size={14} className="text-emerald-600" />
                : <AlertCircle size={14} className="text-red-600" />}
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Saúde</p>
            </div>
            <p className={`text-2xl font-black ${resultado >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {resultado >= 0 ? '✅ Saudável' : '⚠️ No vermelho'}
            </p>
            <p className={`text-sm font-bold mt-1 ${resultado >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {fmt(resultado)}
            </p>
          </div>
        </div>

        {/* Alertas de pendência */}
        {Number(mesAtual?.total_pendente) > 0 && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
            <p className="text-sm font-bold text-amber-800">
              {fmt(mesAtual.total_pendente)} em atendimentos pendentes este mês
            </p>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            GRÁFICO 1 — VALOR FATURADO BRUTO (barras mensais)
            Idêntico à planilha: qtd em cima, valor embaixo
        ════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
          <div className="px-6 py-4" style={{ backgroundColor: FUNDO_HEADER }}>
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              Valor Faturado Bruto
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Procedimentos realizados mês a mês
            </p>
          </div>
          <div className="p-6">
            {dadosFaturamento.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosFaturamento} margin={{ top: 30, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="mes" axisLine={false} tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    tickFormatter={fmtK} />
                  <Tooltip content={<TooltipMoeda />} cursor={{ fill: '#f8fafc' }} />
                  {/* Barra de faturamento com quantidade acima */}
                  <Bar dataKey="faturamento" name="Faturamento" fill={COR_BARRA_PRINCIPAL}
                    radius={[4, 4, 0, 0]} maxBarSize={55}>
                    <LabelList dataKey="qtd" content={<LabelQtd />} />
                  </Bar>
                  {/* Barra de lucro sobreposta */}
                  <Bar dataKey="lucro" name="Lucro Real" fill={COR_BARRA_LUCRO}
                    radius={[4, 4, 0, 0]} maxBarSize={55} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-300 text-sm">
                Sem dados de faturamento
              </div>
            )}
            {/* Legenda manual como na planilha */}
            <div className="flex items-center gap-6 mt-2 justify-center">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COR_BARRA_PRINCIPAL }} />
                <span className="text-[11px] font-bold text-slate-500 uppercase">Faturamento Bruto</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COR_BARRA_LUCRO }} />
                <span className="text-[11px] font-bold text-slate-500 uppercase">Lucro Real</span>
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4" style={{ backgroundColor: FUNDO_HEADER }}>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                Procedimentos + Feitos
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">Lucro Possível por serviço</p>
            </div>
            <div className="p-5">
              {dadosLucroPossivel.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(260, dadosLucroPossivel.length * 34)}>
                  <BarChart data={dadosLucroPossivel} layout="vertical"
                    margin={{ top: 0, right: 80, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="nome" type="category" axisLine={false} tickLine={false}
                      tick={{ fill: '#374151', fontSize: 11, fontWeight: '600' }} width={110} />
                    <Tooltip content={<TooltipMoeda />} cursor={{ fill: '#fef2f2' }} />
                    <Bar dataKey="valor" name="Lucro Possível" fill={COR_POSITIVO}
                      radius={[0, 4, 4, 0]} barSize={20}>
                      <LabelList dataKey="valor" position="right"
                        formatter={v => fmt(v)}
                        style={{ fill: '#374151', fontSize: 10, fontWeight: 'bold' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-300 text-sm">
                  Sem dados neste mês
                </div>
              )}
            </div>
          </div>

          {/* Lucro Real por procedimento (pode ter negativos) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4" style={{ backgroundColor: FUNDO_HEADER }}>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                Lucro por Procedimento
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Lucro Real — valores negativos = prejuízo
              </p>
            </div>
            <div className="p-5">
              {dadosLucroReal.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(260, dadosLucroReal.length * 34)}>
                  <BarChart data={dadosLucroReal} layout="vertical"
                    margin={{ top: 0, right: 80, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1} />
                    <YAxis dataKey="nome" type="category" axisLine={false} tickLine={false}
                      tick={{ fill: '#374151', fontSize: 11, fontWeight: '600' }} width={110} />
                    <Tooltip content={<TooltipMoeda />} cursor={{ fill: '#fef2f2' }} />
                    <Bar dataKey="valor" name="Lucro Real" barSize={20} radius={[0, 4, 4, 0]}>
                      {dadosLucroReal.map((entry, index) => (
                        <Cell key={`cell-${index}`}
                          fill={entry.valor >= 0 ? COR_POSITIVO : COR_NEGATIVO} />
                      ))}
                      <LabelList dataKey="valor" position="right"
                        formatter={v => fmt(v)}
                        style={{ fill: '#374151', fontSize: 10, fontWeight: 'bold' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-300 text-sm">
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
          <div className="px-6 py-4" style={{ backgroundColor: FUNDO_HEADER }}>
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              Lucro Possível vs Lucro Real
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Comparativo acumulado do período</p>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={[
                  { nome: 'Lucro Possível', valor: totalPossivel },
                  { nome: 'Lucro Real', valor: totalReal },
                ]}
                margin={{ top: 30, right: 40, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="nome" axisLine={false} tickLine={false}
                  tick={{ fill: '#374151', fontSize: 12, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={fmtK} />
                <Tooltip content={<TooltipMoeda />} cursor={{ fill: '#fef2f2' }} />
                <Bar dataKey="valor" maxBarSize={120} radius={[6, 6, 0, 0]}>
                  <Cell fill={COR_BARRA_PRINCIPAL} />
                  <Cell fill={COR_BARRA_LUCRO} />
                  <LabelList dataKey="valor" position="top"
                    formatter={v => fmt(v)}
                    style={{ fill: '#374151', fontSize: 11, fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════
            GRÁFICO 5 — RENDIMENTO LÍQUIDO DO FUNCIONÁRIO
            Barras verticais por profissional com valor acima
        ════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
          <div className="px-6 py-4" style={{ backgroundColor: FUNDO_HEADER }}>
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              Rendimento Líquido do Funcionário
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Quanto cada profissional gerou no período</p>
          </div>
          <div className="p-6">
            {dadosRendimento.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dadosRendimento} margin={{ top: 30, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="nome" axisLine={false} tickLine={false}
                    tick={{ fill: '#374151', fontSize: 11, fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={fmtK} />
                  <Tooltip content={<TooltipMoeda />} cursor={{ fill: '#fef2f2' }} />
                  <Bar dataKey="valor" name="Rendimento" fill={COR_FUNCIONARIA}
                    radius={[4, 4, 0, 0]} maxBarSize={60}>
                    <LabelList dataKey="valor" position="top"
                      formatter={v => fmt(v)}
                      style={{ fill: '#374151', fontSize: 10, fontWeight: 'bold' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-300 text-sm">
                Sem dados de rendimento neste mês
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════
            GRÁFICO 6 — VENDA HOME CAR
            Com seletor de ano (2024/2025) igual à planilha
        ════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: FUNDO_HEADER }}>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                Venda Home Care
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">Produtos vendidos para levar para casa</p>
            </div>
            {/* Seletor de ano igual à planilha */}
            <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
              {[new Date().getFullYear(), new Date().getFullYear() - 1].map(ano => (
                <button key={ano} onClick={() => setAnoHomecare(ano)}
                  className={`px-3 py-1.5 rounded text-xs font-black transition-all ${anoHomecare === ano
                    ? 'bg-amber-400 text-slate-900'
                    : 'text-slate-300 hover:text-white'}`}>
                  {ano}
                </button>
              ))}
            </div>
          </div>
          <div className="p-6">
            {/* KPI total do ano */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-600 uppercase">
                Venda Home Care {anoHomecare}
              </p>
              <p className="text-2xl font-black text-slate-800">{fmt(totalHomecarAno)}</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Barras de venda */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">Venda / Pendência por Mês</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={homecareMensal} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="mes" axisLine={false} tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={fmtK} />
                    <Tooltip content={<TooltipMoeda />} cursor={{ fill: '#fef2f2' }} />
                    <Bar dataKey="venda" name="Venda" fill={COR_BARRA_PRINCIPAL}
                      radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Barras de lucro */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">Lucro por Mês</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={homecareMensal} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="mes" axisLine={false} tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={fmtK} />
                    <Tooltip content={<TooltipMoeda />} cursor={{ fill: '#fef2f2' }} />
                    <Bar dataKey="lucro" name="Lucro" fill={COR_BARRA_LUCRO}
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
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
                <Bookmark size={18} className="text-white" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">Fechamento do Mês</h3>
                <p className="text-xs text-slate-500 mt-0.5">Salve uma foto dos resultados deste mês.</p>
              </div>
            </div>
            {fechamentoExiste ? (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 font-bold text-sm">
                <CheckCircle size={16} /> Mês fechado
              </div>
            ) : (
              <button
                onClick={async () => {
                  if (!mesAtual) return;
                  setSalvandoFechamento(true);
                  const lucro = Number(mesAtual.lucro_real) || 0;
                  const resultadoFinal = lucro + homecareDados.lucro - despesasDados.total - gastosPessoais - salariosFixos;
                  const [ano, mes] = mesSelecionado.split('-');
                  const { error } = await supabase.from('fechamentos').upsert({
                    salao_id: salaoId,
                    mes: `${ano}-${mes}-01`,
                    faturamento_bruto: Number(mesAtual.faturamento_bruto) || 0,
                    lucro_liquido: lucro,
                    lucro_possivel: Number(mesAtual.lucro_possivel) || lucro,
                    total_atendimentos: Number(mesAtual.total_atendimentos) || 0,
                    total_pendente: Number(mesAtual.total_pendente) || 0,
                    total_despesas: despesasDados.total,
                    total_gastos_pessoais: gastosPessoais,
                    lucro_homecare: homecareDados.lucro,
                    resultado_final: resultadoFinal,
                  }, { onConflict: 'salao_id,mes' });
                  setSalvandoFechamento(false);
                  if (error) alert('Erro: ' + error.message);
                  else { setFechamentoExiste(true); alert('✅ Mês fechado com sucesso!'); }
                }}
                disabled={salvandoFechamento}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg text-sm disabled:opacity-50"
              >
                {salvandoFechamento ? 'Salvando...' : '📸 Fechar Este Mês'}
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-[10px] text-slate-300 font-medium">
          Dados em tempo real · Salão Secreto
        </div>

      </>)}
    </div>
  );
}