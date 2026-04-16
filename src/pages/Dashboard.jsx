import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { FinancialEngine } from '../services/FinancialEngine';
import { Lock, TrendingUp, DollarSign, Activity, Users, AlertCircle, Package, ArrowUpRight, ArrowDownRight, CheckCircle, Heart, Bookmark } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, ComposedChart, Line, Area, AreaChart
} from 'recharts';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const MESES_PT = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const CORES_PROC = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#7c3aed', '#5b21b6', '#4f46e5'];
const CORES_PIE = ['#ef4444', '#f59e0b', '#6366f1', '#10b981'];

const Dashboard = ({ salaoId }) => {
  // ─── Estado de segurança ───
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const PIN_CORRETO = '1234';

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
        .eq('salao_id', salaoId);
      setGastosPessoais(gpData ? gpData.reduce((a, v) => a + Number(v.valor || 0), 0) : 0);

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
    const totalComissao = rendimento.reduce((a, r) => a + Number(r.rendimento_bruto || 0), 0);
    if (totalComissao > 0) items.push({ nome: 'Comissões', valor: totalComissao });
    if (homecareDados.pendencia > 0) items.push({ nome: 'Pendências HC', valor: homecareDados.pendencia });
    if (items.length === 0) items.push({ nome: 'Sem dados', valor: 1 });
    return items;
  }, [despesasDados, rendimento, homecareDados]);

  const verificarPin = (e) => {
    e.preventDefault();
    if (pin === PIN_CORRETO) setUnlocked(true);
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-200 w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-slate-900 to-slate-700 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Painel Financeiro</h2>
          <p className="text-slate-500 mb-8 text-sm font-medium">Acesso restrito à gestão financeira.</p>
          <form onSubmit={verificarPin} className="space-y-4">
            <input
              type="password" maxLength={4} placeholder="PIN"
              className="w-full text-center text-4xl tracking-[0.5em] font-black border-b-2 border-slate-200 py-4 outline-none focus:border-emerald-500 bg-transparent"
              value={pin} onChange={e => setPin(e.target.value)} autoFocus
            />
            <button type="submit" className="w-full bg-gradient-to-r from-slate-900 to-slate-800 text-white py-4 rounded-xl font-bold hover:from-slate-800 hover:to-slate-700 transition-all mt-4 shadow-lg">
              Desbloquear Painel
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── TELA DO DASHBOARD ───
  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Painel Financeiro</h1>
          <p className="text-slate-500 text-sm">Visão consolidada de resultados reais.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={mesSelecionado}
            onChange={e => setMesSelecionado(e.target.value)}
            className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          >
            {meses.map(m => (
              <option key={m} value={m}>
                {new Date(m + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
          <button
            onClick={() => { setUnlocked(false); setPin(''); }}
            className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-100 text-sm transition-colors"
          >
            <Lock size={16} /> Bloquear
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-slate-400 font-medium">Carregando dados financeiros...</div>
        </div>
      ) : (
        <>
          {/* ═══ CARDS DE RESUMO ═══ */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-slate-900/5 rounded-full -mr-4 -mt-4" />
              <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-1"><TrendingUp size={12} /> Faturamento</p>
              <h3 className="text-xl font-black text-slate-800">{fmt(mesAtual?.faturamento_bruto)}</h3>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full -mr-4 -mt-4" />
              <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-1"><DollarSign size={12} /> Lucro Líquido</p>
              <h3 className={`text-xl font-black ${Number(mesAtual?.lucro_real) < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                {fmt(mesAtual?.lucro_real)}
              </h3>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full -mr-4 -mt-4" />
              <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-1"><Activity size={12} /> Ticket Médio</p>
              <h3 className="text-xl font-black text-blue-600">
                {fmt(mesAtual?.total_atendimentos > 0 ? Number(mesAtual.faturamento_bruto) / Number(mesAtual.total_atendimentos) : 0)}
              </h3>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-violet-500/5 rounded-full -mr-4 -mt-4" />
              <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-1"><Users size={12} /> Atendimentos</p>
              <h3 className="text-xl font-black text-violet-600">{mesAtual?.total_atendimentos || 0}</h3>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full -mr-4 -mt-4" />
              <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-1"><Package size={12} /> HomeCare</p>
              <h3 className="text-xl font-black text-amber-600">{fmt(homecareDados.lucro)}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">{homecareDados.vendas} vendas</p>
            </div>
          </div>

          {/* ═══ SAÚDE DA EMPRESA ═══ */}
          {mesAtual && (() => {
            const lucro = Number(mesAtual.lucro_real) || 0;
            const resultado = lucro + homecareDados.lucro - despesasDados.total - gastosPessoais;
            const saudavel = resultado > 0;
            return (
              <div className={`mb-8 p-5 rounded-2xl border-2 ${saudavel ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Heart size={20} className={saudavel ? 'text-emerald-500' : 'text-red-500'} />
                    <div>
                      <p className="text-sm font-black text-slate-800">
                        {saudavel ? '✅ Empresa Saudável' : '⚠️ Empresa no Vermelho'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Lucro ({fmt(lucro)}) + HomeCare ({fmt(homecareDados.lucro)}) − Despesas ({fmt(despesasDados.total)}) − Gastos Pessoais ({fmt(gastosPessoais)})
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
              <AlertCircle size={18} className="text-amber-500 flex-shrink-0" />
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
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-80">
              <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4">Evolução Mensal</h3>
              {dadosGraficoEvolucao.length > 0 ? (
                <ResponsiveContainer width="100%" height="85%">
                  <ComposedChart data={dadosGraficoEvolucao} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `R$${v / 1000}k`} />
                    <Tooltip content={<TooltipMoeda />} cursor={{ fill: '#f8fafc' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                    <Bar dataKey="faturamento" name="Faturamento" fill="#0f172a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="lucro" name="Lucro" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-300 text-sm">Sem dados de evolução</div>
              )}
            </div>

            {/* Gráfico 2: Ranking de Procedimentos */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-80">
              <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4">Ranking de Procedimentos</h3>
              {dadosGraficoProcs.length > 0 ? (
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={dadosGraficoProcs} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="nome" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 'bold' }} width={110} />
                    <Tooltip content={<TooltipMoeda />} cursor={{ fill: '#f8fafc' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                    <Bar dataKey="receita" name="Receita" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={18} />
                    <Bar dataKey="lucro" name="Lucro" fill="#10b981" radius={[0, 4, 4, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-300 text-sm">Sem procedimentos neste mês</div>
              )}
            </div>

            {/* Gráfico 3: Comissões por Profissional */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-80">
              <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4">Comissões a Pagar</h3>
              {dadosGraficoComissoes.length > 0 ? (
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={dadosGraficoComissoes} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="nome" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 'bold' }} width={80} />
                    <Tooltip content={<TooltipMoeda />} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="comissao" name="Comissão" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-300 text-sm">Sem comissões neste mês</div>
              )}
            </div>

            {/* Gráfico 4: Distribuição de Saídas */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-80 flex flex-col">
              <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1">Distribuição de Saídas</h3>
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
          <div className="mt-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Bookmark size={16} className="text-indigo-500" /> Fechamento do Mês
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Salve uma foto dos resultados financeiros deste mês.
                </p>
              </div>
              {fechamentoExiste ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 font-bold text-sm">
                  <CheckCircle size={16} /> Mês fechado
                </div>
              ) : (
                <button
                  onClick={async () => {
                    if (!mesAtual) return;
                    setSalvandoFechamento(true);
                    const lucro = Number(mesAtual.lucro_real) || 0;
                    const resultado = lucro + homecareDados.lucro - despesasDados.total - gastosPessoais;
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
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-200 text-sm disabled:opacity-50"
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