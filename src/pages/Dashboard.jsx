import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, TrendingUp, Users, DollarSign, Activity } from 'lucide-react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell 
} from 'recharts';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const CORES = ['#10b981', '#0f172a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Dashboard({ salaoId }) {
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinCorreto, setPinCorreto] = useState('1234');
  
  // Estados para os Gráficos
  const [dadosEvolucao, setDadosEvolucao] = useState([]);
  const [dadosProfissionais, setDadosProfissionais] = useState([]);
  const [dadosDespesas, setDadosDespesas] = useState([]);
  const [resumoAtual, setResumoAtual] = useState({ faturamento: 0, lucro: 0, ticket: 0, atendimentos: 0 });

  useEffect(() => {
    if (salaoId) carregarConfiguracoes();
  }, [salaoId]);

  useEffect(() => {
    if (unlocked && salaoId) carregarPainelSecreto();
  }, [unlocked]);

  const carregarConfiguracoes = async () => {
    const { data } = await supabase.from('saloes').select('pin_financeiro').eq('id', salaoId).single();
    if (data?.pin_financeiro) setPinCorreto(data.pin_financeiro);
  };

  const verificarPin = (e) => {
    e.preventDefault();
    if (pin === pinCorreto) setUnlocked(true);
    else { alert('PIN Incorreto!'); setPin(''); }
  };

  const carregarPainelSecreto = async () => {
    setLoading(true);
    try {
      // 1. Dados de Evolução Mensal (Faturamento, Lucro, Atendimentos, Ticket)
      const { data: mensal } = await supabase
        .from('fechamento_mensal')
        .select('*')
        .eq('salao_id', salaoId)
        .order('mes', { ascending: true })
        .limit(12);

      const formatadoMensal = (mensal || []).map(m => ({
        mes: new Date(m.mes + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        faturamento: Number(m.faturamento_bruto || 0),
        lucro: Number(m.lucro_real || 0),
        atendimentos: Number(m.total_atendimentos || 0),
        ticket_medio: Number(m.faturamento_bruto || 0) / (Number(m.total_atendimentos) || 1)
      }));
      setDadosEvolucao(formatadoMensal);

      if (formatadoMensal.length > 0) {
        const ultimoMes = formatadoMensal[formatadoMensal.length - 1];
        setResumoAtual({
          faturamento: ultimoMes.faturamento,
          lucro: ultimoMes.lucro,
          ticket: ultimoMes.ticket_medio,
          atendimentos: ultimoMes.atendimentos
        });
      }

      // 2. Comissões por Profissional (Mês Atual)
      const dataHoje = new Date();
      const primeiroDiaMes = new Date(dataHoje.getFullYear(), dataHoje.getMonth(), 1).toISOString().split('T')[0];
      
      const { data: profs } = await supabase
        .from('rendimento_por_profissional')
        .select('profissional, rendimento_bruto')
        .eq('salao_id', salaoId)
        .gte('mes', primeiroDiaMes);

      setDadosProfissionais((profs || []).map(p => ({
        nome: p.profissional,
        comissao: Number(p.rendimento_bruto || 0)
      })));

      // 3. Despesas x Gastos Pessoais (Mês Atual)
      const [resDespesas, resGastos] = await Promise.all([
        supabase.from('despesas').select('valor').eq('salao_id', salaoId).gte('data', primeiroDiaMes),
        supabase.from('gastos_pessoais').select('valor').eq('salao_id', salaoId).gte('criado_em', primeiroDiaMes)
      ]);

      const totalDespesas = (resDespesas.data || []).reduce((acc, curr) => acc + Number(curr.valor), 0);
      const totalGastosPessoais = (resGastos.data || []).reduce((acc, curr) => acc + Number(curr.valor), 0);

      setDadosDespesas([
        { nome: 'Despesas do Salão', valor: totalDespesas },
        { nome: 'Gastos Pessoais', valor: totalGastosPessoais }
      ]);

    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // Custom Tooltip para Moeda
  const TooltipMoeda = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-xl">
          <p className="font-bold text-slate-800 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-bold">
              {entry.name}: {fmt(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // --- TELA DE BLOQUEIO ---
  if (!unlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] animate-fadeIn">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-slate-900 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Aba Secreta</h2>
          <p className="text-slate-500 mb-8 text-sm">Insira seu PIN para visualizar os gráficos de faturamento.</p>
          <form onSubmit={verificarPin} className="space-y-4">
            <input 
              type="password" maxLength={4} placeholder="••••"
              className="w-full text-center text-4xl tracking-[1em] font-bold border-2 border-slate-100 rounded-2xl py-4 focus:border-slate-900 outline-none"
              value={pin} onChange={e => setPin(e.target.value)} autoFocus
            />
            <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800">Desbloquear Painel</button>
          </form>
        </div>
      </div>
    );
  }

  // --- DASHBOARD GRÁFICOS ---
  return (
    <div className="p-6 max-w-[1600px] mx-auto animate-fadeIn space-y-6">
      
      {/* HEADER DE RESUMO RÁPIDO */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Painel de Resultados</h1>
          <p className="text-slate-500">Visão consolidada do seu negócio.</p>
        </div>
        <button onClick={() => setUnlocked(false)} className="bg-slate-100 p-3 rounded-full text-slate-500 hover:bg-slate-200" title="Trancar Painel"><Lock size={20}/></button>
      </div>

      {/* CARDS METRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-slate-900">
          <p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><TrendingUp size={14}/> Faturamento Bruto (Mês)</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">{fmt(resumoAtual.faturamento)}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><DollarSign size={14}/> Lucro Líquido (Mês)</p>
          <h3 className="text-2xl font-black text-emerald-600 mt-1">{fmt(resumoAtual.lucro)}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
          <p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><Activity size={14}/> Ticket Médio</p>
          <h3 className="text-2xl font-black text-blue-600 mt-1">{fmt(resumoAtual.ticket)}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-purple-500">
          <p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><Users size={14}/> Atendimentos</p>
          <h3 className="text-2xl font-black text-purple-600 mt-1">{resumoAtual.atendimentos}</h3>
        </div>
      </div>

      {/* GRID DE GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* GRÁFICO 1: FATURAMENTO X LUCRO */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-[400px]">
          <h3 className="font-bold text-slate-800 mb-6 uppercase text-sm tracking-wider">Faturamento vs Lucro Líquido</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={dadosEvolucao} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
              <YAxis hide />
              <Tooltip content={<TooltipMoeda />} cursor={{fill: '#f8fafc'}} />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Bar dataKey="faturamento" name="Faturamento Bruto" fill="#0f172a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="lucro" name="Lucro Líquido" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* GRÁFICO 2: TICKET MÉDIO E VOLUME (Misto) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-[400px]">
          <h3 className="font-bold text-slate-800 mb-6 uppercase text-sm tracking-wider">Ticket Médio & Volume de Atendimentos</h3>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={dadosEvolucao} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
              <YAxis yAxisId="left" hide />
              <YAxis yAxisId="right" orientation="right" hide />
              <Tooltip content={<TooltipMoeda />} />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Line yAxisId="left" type="monotone" dataKey="ticket_medio" name="Ticket Médio (R$)" stroke="#3b82f6" strokeWidth={4} dot={{r: 6}} activeDot={{r: 8}} />
              <Line yAxisId="right" type="monotone" dataKey="atendimentos" name="Qtd. Atendimentos" stroke="#a855f7" strokeWidth={4} dot={{r: 6}} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* GRÁFICO 3: COMISSÕES POR PROFISSIONAL */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-[400px]">
          <h3 className="font-bold text-slate-800 mb-6 uppercase text-sm tracking-wider">Valor Pago em Comissão (Mês Atual)</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={dadosProfissionais} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis dataKey="nome" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12, fontWeight: 'bold'}} width={100} />
              <Tooltip content={<TooltipMoeda />} cursor={{fill: '#f8fafc'}} />
              <Bar dataKey="comissao" name="Comissão Paga" fill="#f59e0b" radius={[0, 6, 6, 0]} barSize={24}>
                {dadosProfissionais.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* GRÁFICO 4: CUSTOS E GASTOS PESSOAIS */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-[400px] flex flex-col">
          <h3 className="font-bold text-slate-800 mb-2 uppercase text-sm tracking-wider">Distribuição de Saídas (Mês Atual)</h3>
          <p className="text-xs text-slate-400 mb-6">Proporção entre despesas do salão e retiradas pessoais.</p>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={dadosDespesas} 
                  cx="50%" cy="50%" 
                  innerRadius={80} outerRadius={120} 
                  paddingAngle={5} dataKey="valor"
                  stroke="none"
                >
                  <Cell fill="#ef4444" /> {/* Vermelho para Despesas */}
                  <Cell fill="#f97316" /> {/* Laranja para Gastos Pessoais */}
                </Pie>
                <Tooltip content={<TooltipMoeda />} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}