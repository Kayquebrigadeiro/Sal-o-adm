import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { FinancialEngine } from '../services/FinancialEngine';
import {
  Lock, TrendingUp, DollarSign, Activity, Users, AlertCircle,
  Package, ArrowUpRight, ArrowDownRight, CheckCircle, Heart,
  Bookmark, CalendarDays, Sparkles, ShieldCheck
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, ComposedChart, Line, Area, AreaChart
} from 'recharts';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const MESES_PT = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const CORES_PROC = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#7c3aed', '#5b21b6', '#4f46e5'];
const CORES_PIE = ['#f43f5e', '#f59e0b', '#6366f1', '#10b981'];

// KPI Card com design inspirado nas referências Supplierj + Avec
const KpiCard = ({ icon: Icon, label, value, subtitle, gradientFrom, gradientTo, iconBg, textColor }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
    <div className="p-5 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center shadow-lg flex-shrink-0 group-hover:scale-105 transition-transform`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
        <h3 className={`text-xl font-black ${textColor || 'text-slate-800'} truncate`}>{value}</h3>
        {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <div className={`h-1 bg-gradient-to-r ${gradientFrom} ${gradientTo} opacity-60`} />
  </div>
);

const Dashboard = ({ salaoId }) => {
  // ─── Estado de segurança ───
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinCorreto, setPinCorreto] = useState('');

  useEffect(() => {
    if (!salaoId) return;
    const fetchPin = async () => {
      const { data } = await supabase.from('saloes').select('pin_financeiro').eq('id', salaoId).single();
      if (data && data.pin_financeiro) {
        setPinCorreto(data.pin_financeiro);
      } else {
        setPinCorreto('1234'); // Fallback caso não esteja configurado
      }
    };
    fetchPin();
  }, [salaoId]);

  // ─── Dados reais ───
  const [loading, setLoading] = useState(true);
  const [mesSelecionado, setMesSelecionado] = useState('');
  const [meses, setMeses] = useState([]);

  // Dados brutos do Supabase
  const [fechamento, setFechamento] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [rendimento, setRendimento] = useState([]);
  const [homecareDados, setHomecareDados] = useState({ lucro: 0, pendencia: 0, vendas: 0 });
  const [despesasDados, setDespesasDados] = useState({ total: 0, items: [] });
  const [gastosPessoais, setGastosPessoais] = useState(0);
  const [salariosFixos, setSalariosFixos] = useState(0);
  const [fechamentoExiste, setFechamentoExiste] = useState(false);
  const [salvandoFechamento, setSalvandoFechamento] = useState(false);

  // Gerar últimos 12 meses
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

  // Carregar dados quando o mês mudar
  useEffect(() => {
    if (!salaoId || !mesSelecionado || !unlocked) return;
    carregarDados();
  }, [salaoId, mesSelecionado, unlocked]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [ano, mes] = mesSelecionado.split('-');
      const inicioMes = `${ano}-${mes}-01`;
      const fimMes = new Date(Number(ano), Number(mes), 0).toISOString().split('T')[0];

      // 1. Fechamento mensal (view no banco)
      const { data: fechData } = await supabase
        .from('fechamento_mensal')
        .select('*')
        .eq('salao_id', salaoId)
        .order('mes', { ascending: true })
        .limit(12);
      setFechamento(fechData || []);

      // 2. Ranking de procedimentos (view no banco)
      const { data: rankData } = await supabase
        .from('ranking_procedimentos')
        .select('*')
        .eq('salao_id', salaoId)
        .gte('mes', inicioMes)
        .lte('mes', fimMes)
        .order('receita_total', { ascending: false });
      setRanking(rankData || []);

      // 3. Rendimento por profissional (view no banco)
      const { data: rendData } = await supabase
        .from('rendimento_por_profissional')
        .select('*')
        .eq('salao_id', salaoId)
        .gte('mes', inicioMes)
        .lte('mes', fimMes)
        .order('rendimento_bruto', { ascending: false });
      setRendimento(rendData || []);

      // 4. HomeCare do mês
      const { data: hcData } = await supabase
        .from('homecare')
        .select('lucro, valor_pendente, valor_venda')
        .eq('salao_id', salaoId)
        .gte('data', inicioMes)
        .lte('data', fimMes);

      if (hcData && hcData.length > 0) {
        setHomecareDados({
          lucro: hcData.reduce((a, v) => a + Number(v.lucro || 0), 0),
          pendencia: hcData.reduce((a, v) => a + Number(v.valor_pendente || 0), 0),
          vendas: hcData.length,
        });
      } else {
        setHomecareDados({ lucro: 0, pendencia: 0, vendas: 0 });
      }

      // 5. Despesas do mês
      const { data: despData } = await supabase
        .from('despesas')
        .select('descricao, tipo, valor')
        .eq('salao_id', salaoId)
        .gte('data', inicioMes)
        .lte('data', fimMes);

      if (despData && despData.length > 0) {
        setDespesasDados({
          total: despData.reduce((a, v) => a + Number(v.valor || 0), 0),
          items: despData,
        });
      } else {
        setDespesasDados({ total: 0, items: [] });
      }

      // 6. Gastos pessoais do mês
      const { data: gpData } = await supabase
        .from('gastos_pessoais')
        .select('valor')
        .eq('salao_id', salaoId)
        .gte('criado_em', `${inicioMes}T00:00:00Z`)
        .lte('criado_em', `${fimMes}T23:59:59Z`);
      setGastosPessoais(gpData ? gpData.reduce((a, v) => a + Number(v.valor || 0), 0) : 0);

      // 6.1 Salários Fixos (para abater na saúde da empresa)
      const { data: profData } = await supabase
        .from('profissionais')
        .select('salario_fixo')
        .eq('salao_id', salaoId)
        .eq('ativo', true);
      setSalariosFixos(profData ? profData.reduce((a, v) => a + Number(v.salario_fixo || 0), 0) : 0);

      // 7. Verificar se já tem fechamento
      const { data: fData } = await supabase
        .from('fechamentos')
        .select('id')
        .eq('salao_id', salaoId)
        .eq('mes', inicioMes)
        .maybeSingle();
      setFechamentoExiste(!!fData);

    } catch (err) {
      console.error('Erro no Dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Dados derivados ───
  const mesAtual = useMemo(() => {
    if (!fechamento.length) return null;
    const [ano, mes] = mesSelecionado.split('-');
    const target = `${ano}-${mes}-01`;
    return fechamento.find(f => f.mes === target) || fechamento[fechamento.length - 1];
  }, [fechamento, mesSelecionado]);

  const dadosGraficoEvolucao = useMemo(() => {
    return fechamento.map(f => {
      const d = new Date(f.mes + 'T00:00:00');
      const qtd = Number(f.total_atendimentos) || 1;
      return {
        mes: MESES_PT[d.getMonth() + 1],
        faturamento: Number(f.faturamento_bruto) || 0,
        lucro: Number(f.lucro_real) || 0,
        ticket: Math.round((Number(f.faturamento_bruto) || 0) / qtd),
        atendimentos: Number(f.total_atendimentos) || 0,
      };
    });
  }, [fechamento]);

  const dadosGraficoProcs = useMemo(() => {
    return ranking.slice(0, 8).map(r => ({
      nome: r.procedimento,
      receita: Number(r.receita_total) || 0,
      lucro: Number(r.lucro_total) || 0,
      qtd: Number(r.quantidade) || 0,
    }));
  }, [ranking]);

  const dadosGraficoComissoes = useMemo(() => {
    return rendimento.map(r => ({
      nome: r.profissional,
      comissao: Number(r.rendimento_bruto) || 0,
      atendimentos: Number(r.atendimentos) || 0,
    }));
  }, [rendimento]);

  const dadosPie = useMemo(() => {
    const items = [];
    if (despesasDados.total > 0) items.push({ nome: 'Despesas Fixas', valor: despesasDados.total });
    if (salariosFixos > 0) items.push({ nome: 'Salários Fixos', valor: salariosFixos });
    const totalComissao = rendimento.reduce((a, r) => a + Number(r.rendimento_bruto || 0), 0);
    if (totalComissao > 0) items.push({ nome: 'Comissões', valor: totalComissao });
    if (homecareDados.pendencia > 0) items.push({ nome: 'Pendências HC', valor: homecareDados.pendencia });
    if (items.length === 0) items.push({ nome: 'Sem dados', valor: 1 });
    return items;
  }, [despesasDados, rendimento, homecareDados, salariosFixos]);

  const verificarPin = (e) => {
    e.preventDefault();
    if (pin === pinCorreto) setUnlocked(true);
    else { alert('PIN Incorreto!'); setPin(''); }
  };

  const TooltipMoeda = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm p-3 border border-slate-200 shadow-xl rounded-xl">
          <p className="font-bold text-slate-800 mb-2">{label}</p>
          {payload.map((entry, i) => (
            <p key={i} style={{ color: entry.color }} className="text-xs font-bold uppercase">
              {entry.name}: {entry.name === 'Atendimentos' || entry.name === 'Qtd' ? entry.value : fmt(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // ─── TELA DE BLOQUEIO ───
  if (!unlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 relative overflow-hidden">
        {/* Blobs decorativos */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-rose-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-amber-500/10 rounded-full blur-[80px]" />

        <div className="bg-white/[0.07] backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/10 w-full max-w-sm text-center relative animate-fadeIn">
          <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-amber-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-rose-500/30">
            <Lock size={28} />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Painel Financeiro</h2>
          <p className="text-slate-400 mb-8 text-sm font-medium">Acesso restrito à gestão financeira.</p>
          <form onSubmit={verificarPin} className="space-y-4">
            <input
              type="password" maxLength={4} placeholder="PIN"
              className="w-full text-center text-4xl tracking-[0.5em] font-black bg-white/[0.07] border border-white/10 text-white rounded-xl py-4 outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 placeholder:text-slate-600"
              value={pin} onChange={e => setPin(e.target.value)} autoFocus
            />
            <button type="submit" className="w-full bg-gradient-to-r from-rose-500 to-amber-500 text-white py-4 rounded-xl font-bold hover:from-rose-600 hover:to-amber-600 transition-all mt-4 shadow-xl shadow-rose-500/20">
              Desbloquear Painel
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── TELA DO DASHBOARD ───
  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-rose-50/30 min-h-screen font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-rose-400" />
            <h1 className="text-2xl font-black bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Painel Financeiro</h1>
          </div>
          <p className="text-slate-400 text-sm">Visão consolidada de resultados em tempo real.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-1 py-1 flex items-center">
            <CalendarDays size={14} className="text-slate-400 ml-2 mr-1" />
            <select
              value={mesSelecionado}
              onChange={e => setMesSelecionado(e.target.value)}
              className="border-0 px-2 py-2 text-sm bg-transparent outline-none font-medium text-slate-700 cursor-pointer"
            >
              {meses.map(m => (
                <option key={m} value={m}>
                  {new Date(m + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => { setUnlocked(false); setPin(''); }}
            className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 text-sm transition-all shadow-sm"
          >
            <Lock size={14} /> Bloquear
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-slate-400 font-medium">
            <div className="w-5 h-5 border-2 border-rose-300 border-t-transparent rounded-full animate-spin" />
            Carregando dados financeiros...
          </div>
        </div>
      ) : (
        <>
          {/* ═══ CARDS KPI COLORIDOS (inspirado Supplierj) ═══ */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <KpiCard
              icon={TrendingUp} label="Faturamento"
              value={fmt(mesAtual?.faturamento_bruto)}
              gradientFrom="from-blue-500" gradientTo="to-blue-600"
            />
            <KpiCard
              icon={DollarSign} label="Lucro Líquido"
              value={fmt(mesAtual?.lucro_real)}
              textColor={Number(mesAtual?.lucro_real) < 0 ? 'text-red-500' : 'text-emerald-600'}
              gradientFrom="from-emerald-500" gradientTo="to-emerald-600"
            />
            <KpiCard
              icon={Activity} label="Ticket Médio"
              value={fmt(mesAtual?.total_atendimentos > 0 ? Number(mesAtual.faturamento_bruto) / Number(mesAtual.total_atendimentos) : 0)}
              gradientFrom="from-violet-500" gradientTo="to-violet-600"
            />
            <KpiCard
              icon={Users} label="Atendimentos"
              value={mesAtual?.total_atendimentos || 0}
              gradientFrom="from-amber-500" gradientTo="to-orange-500"
            />
            <KpiCard
              icon={Package} label="HomeCare"
              value={fmt(homecareDados.lucro)}
              subtitle={`${homecareDados.vendas} vendas`}
              gradientFrom="from-rose-500" gradientTo="to-pink-500"
            />
          </div>

          {/* ═══ SAÚDE DA EMPRESA (redesenhada) ═══ */}
          {mesAtual && (() => {
            const lucro = Number(mesAtual.lucro_real) || 0;
            const resultado = lucro + homecareDados.lucro - despesasDados.total - gastosPessoais - salariosFixos;
            const saudavel = resultado > 0;
            return (
              <div className={`mb-8 p-5 rounded-2xl border-2 backdrop-blur-sm ${saudavel ? 'bg-emerald-50/80 border-emerald-200' : 'bg-red-50/80 border-red-200'}`}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${saudavel ? 'bg-emerald-500' : 'bg-red-500'}`}>
                      {saudavel ? <ShieldCheck size={20} className="text-white" /> : <AlertCircle size={20} className="text-white" />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">
                        {saudavel ? '✅ Empresa Saudável' : '⚠️ Empresa no Vermelho'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Lucro ({fmt(lucro)}) + HomeCare ({fmt(homecareDados.lucro)}) − Despesas ({fmt(despesasDados.total)}) − Salários ({fmt(salariosFixos)}) − Pessoais ({fmt(gastosPessoais)})
                      </p>
                    </div>
                  </div>
                  <p className={`text-2xl font-black ${saudavel ? 'text-emerald-600' : 'text-red-600'}`}>
                    {fmt(resultado)}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* ═══ ALERTAS ═══ */}
          {Number(mesAtual?.total_pendente) > 0 && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-800">Pendências no mês</p>
                <p className="text-xs text-amber-600">
                  {fmt(mesAtual.total_pendente)} em atendimentos pendentes
                  {homecareDados.pendencia > 0 ? ` + ${fmt(homecareDados.pendencia)} em HomeCare` : ''}
                </p>
              </div>
            </div>
          )}

          {/* ═══ GRÁFICOS ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Gráfico 1: Evolução Mensal */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-80">
              <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                Evolução Mensal
              </h3>
              {dadosGraficoEvolucao.length > 0 ? (
                <ResponsiveContainer width="100%" height="85%">
                  <ComposedChart data={dadosGraficoEvolucao} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `R$${v / 1000}k`} />
                    <Tooltip content={<TooltipMoeda />} cursor={{ fill: '#f8fafc' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                    <Bar dataKey="faturamento" name="Faturamento" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="lucro" name="Lucro" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-300 text-sm">Sem dados de evolução</div>
              )}
            </div>

            {/* Gráfico 2: Ranking de Procedimentos */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-80">
              <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-violet-500" />
                Ranking de Procedimentos
              </h3>
              {dadosGraficoProcs.length > 0 ? (
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={dadosGraficoProcs} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="nome" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 'bold' }} width={110} />
                    <Tooltip content={<TooltipMoeda />} cursor={{ fill: '#f8fafc' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                    <Bar dataKey="receita" name="Receita" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={18} />
                    <Bar dataKey="lucro" name="Lucro" fill="#10b981" radius={[0, 6, 6, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-300 text-sm">Sem procedimentos neste mês</div>
              )}
            </div>

            {/* Gráfico 3: Comissões por Profissional */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-80">
              <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                Comissões a Pagar
              </h3>
              {dadosGraficoComissoes.length > 0 ? (
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={dadosGraficoComissoes} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="nome" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 'bold' }} width={80} />
                    <Tooltip content={<TooltipMoeda />} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="comissao" name="Comissão" fill="#f59e0b" radius={[0, 6, 6, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-300 text-sm">Sem comissões neste mês</div>
              )}
            </div>

            {/* Gráfico 4: Distribuição de Saídas */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-80 flex flex-col">
              <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                Distribuição de Saídas
              </h3>
              <p className="text-[10px] text-slate-400 font-bold mb-4">Despesas e Comissões do mês</p>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosPie} cx="50%" cy="50%"
                      innerRadius={60} outerRadius={90}
                      paddingAngle={5} dataKey="valor" stroke="none"
                      label={({ nome, percent }) => `${nome} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {dadosPie.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={CORES_PIE[i % CORES_PIE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<TooltipMoeda />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* ═══ FECHAR MÊS ═══ */}
          <div className="mt-8 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
                  <Bookmark size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Fechamento do Mês</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Salve uma foto dos resultados financeiros deste mês.
                  </p>
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
                    const resultado = lucro + homecareDados.lucro - despesasDados.total - gastosPessoais - salariosFixos;
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
                      resultado_final: resultado,
                    }, { onConflict: 'salao_id,mes' });
                    setSalvandoFechamento(false);
                    if (error) alert('Erro: ' + error.message);
                    else { setFechamentoExiste(true); alert('✅ Mês fechado com sucesso!'); }
                  }}
                  disabled={salvandoFechamento}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl font-bold hover:from-indigo-600 hover:to-violet-700 transition-all shadow-lg shadow-indigo-200 text-sm disabled:opacity-50"
                >
                  {salvandoFechamento ? 'Salvando...' : '📸 Fechar Este Mês'}
                </button>
              )}
            </div>
          </div>

          {/* ═══ RODAPÉ ═══ */}
          <div className="mt-6 text-center text-[10px] text-slate-300 font-medium">
            Motor: FinancialEngine v1.0 • Dados em tempo real do Supabase
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;