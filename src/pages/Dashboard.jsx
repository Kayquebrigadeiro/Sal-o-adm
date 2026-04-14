import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  TrendingUp, Wallet, Target, AlertCircle, 
  Lock, Eye, EyeOff, BarChart3, ArrowUpRight, ArrowDownRight 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie 
} from 'recharts';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Dashboard({ salaoId }) {
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinCorreto, setPinCorreto] = useState('1234'); // Puxaremos do banco
  
  const [mesSelecionado, setMesSelecionado] = useState(new Date().toISOString().slice(0, 7));
  const [dados, setDados] = useState({
    faturamento: 0,
    lucroReal: 0,
    perdaDescontos: 0,
    totalAtendimentos: 0,
    graficoMensal: [],
    rankingServicos: []
  });

  useEffect(() => {
    if (salaoId) carregarConfiguracoes();
  }, [salaoId]);

  useEffect(() => {
    if (unlocked && salaoId) carregarFinanceiro();
  }, [unlocked, mesSelecionado]);

  const carregarConfiguracoes = async () => {
    const { data } = await supabase.from('saloes').select('pin_financeiro').eq('id', salaoId).single();
    if (data?.pin_financeiro) setPinCorreto(data.pin_financeiro);
  };

  const carregarFinanceiro = async () => {
    setLoading(true);
    try {
      // 1. Busca resumo do mês na View que você já tem
      const { data: resumo } = await supabase
        .from('fechamento_mensal')
        .select('*')
        .eq('salao_id', salaoId)
        .eq('mes', mesSelecionado + '-01')
        .single();

      // 2. Busca todos os atendimentos do mês para calcular a "Perda"
      const { data: atendimentos } = await supabase
        .from('atendimentos')
        .select('valor_cobrado, lucro_possivel, lucro_liquido')
        .eq('salao_id', salaoId)
        .gte('data', mesSelecionado + '-01')
        .lte('data', mesSelecionado + '-31')
        .neq('status', 'CANCELADO');

      // Cálculo da "Perda por Desconto" (Diferença entre lucro total e o que entrou)
      const perda = atendimentos?.reduce((acc, curr) => {
        const diff = (curr.lucro_possivel || 0) - (curr.lucro_liquido || 0);
        return acc + (diff > 0 ? diff : 0);
      }, 0);

      // 3. Busca dados para o gráfico (Últimos 6 meses)
      const { data: historico } = await supabase
        .from('fechamento_mensal')
        .select('mes, faturamento_bruto, lucro_real')
        .eq('salao_id', salaoId)
        .order('mes', { ascending: true })
        .limit(6);

      setDados({
        faturamento: resumo?.faturamento_bruto || 0,
        lucroReal: resumo?.lucro_real || 0,
        perdaDescontos: perda || 0,
        totalAtendimentos: resumo?.total_atendimentos || 0,
        graficoMensal: historico?.map(h => ({
          name: new Date(h.mes + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }),
          faturamento: h.faturamento_bruto,
          lucro: h.lucro_real
        })) || []
      });
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const verificarPin = (e) => {
    e.preventDefault();
    if (pin === pinCorreto) {
      setUnlocked(true);
    } else {
      alert('PIN Incorreto!');
      setPin('');
    }
  };

  // --- TELA DE BLOQUEIO ---
  if (!unlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] animate-fadeIn">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Cofre Financeiro</h2>
          <p className="text-slate-500 mb-8 text-sm">Insira seu PIN de segurança para visualizar o faturamento e gráficos.</p>
          
          <form onSubmit={verificarPin} className="space-y-4">
            <input 
              type="password" 
              maxLength={4}
              placeholder="••••"
              className="w-full text-center text-4xl tracking-[1em] font-bold border-2 border-slate-100 rounded-2xl py-4 focus:border-slate-900 focus:ring-0 transition-all outline-none"
              value={pin}
              onChange={e => setPin(e.target.value)}
              autoFocus
            />
            <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 active:scale-95 transition-all">
              Desbloquear Acesso
            </button>
          </form>
          <p className="mt-6 text-xs text-slate-400 font-medium uppercase tracking-widest">Segurança Jacob & Co</p>
        </div>
      </div>
    );
  }

  // --- DASHBOARD DESBLOQUEADO ---
  return (
    <div className="p-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Header Financeiro */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Análise Financeira</h1>
          <p className="text-slate-500">Acompanhe a saúde real do seu negócio.</p>
        </div>
        <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <input 
            type="month" 
            className="border-none focus:ring-0 text-sm font-bold text-slate-700 bg-transparent"
            value={mesSelecionado}
            onChange={e => setMesSelecionado(e.target.value)}
          />
          <button onClick={() => setUnlocked(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400" title="Trancar">
            <Lock size={18} />
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp size={80} />
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase mb-1">Faturamento Bruto</p>
          <h3 className="text-3xl font-black text-slate-900">{fmt(dados.faturamento)}</h3>
          <div className="mt-4 flex items-center gap-1 text-emerald-600 text-xs font-bold">
            <ArrowUpRight size={14} /> <span>+12% vs mês anterior</span>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl shadow-xl relative overflow-hidden">
          <p className="text-sm font-bold text-slate-400 uppercase mb-1">Lucro Líquido Real</p>
          <h3 className="text-3xl font-black text-white">{fmt(dados.lucroReal)}</h3>
          <div className="mt-4 flex items-center gap-1 text-emerald-400 text-xs font-bold">
            <Wallet size={14} /> <span>Dinheiro no bolso</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-sm relative overflow-hidden">
          <p className="text-sm font-bold text-red-400 uppercase mb-1">Perda por Descontos</p>
          <h3 className="text-3xl font-black text-red-600">{fmt(dados.perdaDescontos)}</h3>
          <p className="mt-4 text-[10px] text-slate-400 leading-tight">
            Este valor deixou de ser lucro devido a cobranças abaixo do recomendado.
          </p>
        </div>
      </div>

      {/* Gráfico de Evolução */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 size={20} className="text-slate-400" /> Desempenho Semestral
            </h4>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dados.graficoMensal}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis hide />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                />
                <Bar dataKey="faturamento" fill="#0f172a" radius={[6, 6, 0, 0]} barSize={32} />
                <Bar dataKey="lucro" fill="#10b981" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
             <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
               <div className="w-3 h-3 bg-slate-900 rounded-full"></div> Faturamento
             </div>
             <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
               <div className="w-3 h-3 bg-emerald-500 rounded-full"></div> Lucro Real
             </div>
          </div>
        </div>

        {/* Card de Insights Rápidos */}
        <div className="bg-emerald-50 p-8 rounded-3xl border border-emerald-100 relative overflow-hidden">
          <div className="relative z-10">
            <Target className="text-emerald-600 mb-4" size={32} />
            <h4 className="font-black text-emerald-900 text-xl mb-2">Meta de Lucratividade</h4>
            <p className="text-emerald-700 text-sm mb-6">Sua margem média atual é de <strong>32%</strong>. Para atingir sua meta de R$ 10k, você precisa de mais 14 atendimentos de ticket alto.</p>
            
            <div className="space-y-4">
              <div className="bg-white/60 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-emerald-800 uppercase">Atendimentos Executados</p>
                <p className="text-2xl font-black text-emerald-900">{dados.totalAtendimentos}</p>
              </div>
              <button className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200">
                Ver Relatório Detalhado
              </button>
            </div>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-200/30 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}