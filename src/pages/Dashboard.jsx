import React, { useState } from 'react';
import { Lock, TrendingUp, DollarSign, Activity, Users } from 'lucide-react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, ComposedChart
} from 'recharts';

const Dashboard = () => {
  // 1. ESTADOS DE SEGURANÇA
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const PIN_CORRETO = '1234'; // Depois isso virá do banco de dados

  // 2. DADOS SIMULADOS (Mock) PARA OS GRÁFICOS
  const dadosEvolucao = [
    { mes: 'Jan', faturamento: 8500, lucro: 3200, ticket: 140, atendimentos: 60 },
    { mes: 'Fev', faturamento: 9200, lucro: 3800, ticket: 145, atendimentos: 63 },
    { mes: 'Mar', faturamento: 11000, lucro: 4500, ticket: 152, atendimentos: 72 },
    { mes: 'Abr', faturamento: 10500, lucro: 4100, ticket: 150, atendimentos: 70 },
  ];

  const dadosComissoes = [
    { nome: 'Ricardo', comissao: 2100 },
    { nome: 'Amanda', comissao: 1850 },
    { nome: 'Beatriz', comissao: 1200 },
  ];

  const dadosSaidas = [
    { nome: 'Despesas Fixas (Luz, Água, Produtos)', valor: 4500 },
    { nome: 'Retiradas Pessoais (Pró-labore)', valor: 3000 },
  ];

  const CORES_PIE = ['#ef4444', '#f59e0b']; // Vermelho para despesa, Laranja para retirada

  const verificarPin = (e) => {
    e.preventDefault();
    if (pin === PIN_CORRETO) {
      setUnlocked(true);
    } else {
      alert('PIN Incorreto!');
      setPin('');
    }
  };

  const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Custom Tooltip para formatar como moeda nos gráficos
  const TooltipMoeda = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-xl">
          <p className="font-bold text-slate-800 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-xs font-bold uppercase">
              {entry.name}: {entry.name === 'Atendimentos' ? entry.value : fmt(entry.value)}
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-200 w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-slate-900 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Aba Secreta</h2>
          <p className="text-slate-500 mb-8 text-sm font-medium">Acesso restrito à gestão financeira.</p>
          <form onSubmit={verificarPin} className="space-y-4">
            <input 
              type="password" maxLength={4} placeholder="PIN"
              className="w-full text-center text-4xl tracking-[0.5em] font-black border-b-2 border-slate-200 py-4 outline-none focus:border-emerald-500 bg-transparent"
              value={pin} onChange={e => setPin(e.target.value)} autoFocus
            />
            <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-colors mt-4">
              Desbloquear Painel
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- TELA DO DASHBOARD ---
  const mesAtual = dadosEvolucao[dadosEvolucao.length - 1];

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Painel Financeiro</h1>
          <p className="text-slate-500 text-sm">Visão consolidada de resultados.</p>
        </div>
        <button 
          onClick={() => { setUnlocked(false); setPin(''); }} 
          className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200 text-slate-500 font-bold hover:bg-slate-100 text-sm"
        >
          <Lock size={16} /> Bloquear
        </button>
      </div>

      {/* CARDS DE RESUMO (TOPO) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-slate-900">
          <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-1"><TrendingUp size={12}/> Faturamento (Mês)</p>
          <h3 className="text-2xl font-black text-slate-800">{fmt(mesAtual.faturamento)}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-1"><DollarSign size={12}/> Lucro Líquido (Mês)</p>
          <h3 className="text-2xl font-black text-emerald-600">{fmt(mesAtual.lucro)}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
          <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-1"><Activity size={12}/> Ticket Médio</p>
          <h3 className="text-2xl font-black text-blue-600">{fmt(mesAtual.ticket)}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-purple-500">
          <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-1"><Users size={12}/> Atendimentos</p>
          <h3 className="text-2xl font-black text-purple-600">{mesAtual.atendimentos}</h3>
        </div>
      </div>

      {/* GRID DE GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* GRÁFICO 1: Faturamento x Lucro */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-80">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">Faturamento vs Lucro</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={dadosEvolucao} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(val) => `R$${val/1000}k`} />
              <Tooltip content={<TooltipMoeda />} cursor={{fill: '#f8fafc'}} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
              <Bar dataKey="faturamento" name="Faturamento Bruto" fill="#0f172a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="lucro" name="Lucro Líquido" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* GRÁFICO 2: Ticket Médio x Volume (Composed) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-80">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">Ticket Médio & Atendimentos</h3>
          <ResponsiveContainer width="100%" height="85%">
            <ComposedChart data={dadosEvolucao} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <Tooltip content={<TooltipMoeda />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
              <Bar yAxisId="right" dataKey="atendimentos" name="Atendimentos" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={40} />
              <Line yAxisId="left" type="monotone" dataKey="ticket" name="Ticket Médio (R$)" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* GRÁFICO 3: Comissões Pagas */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-80">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">Comissões a Pagar (Mês)</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={dadosComissoes} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis dataKey="nome" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12, fontWeight: 'bold'}} width={80} />
              <Tooltip content={<TooltipMoeda />} cursor={{fill: '#f8fafc'}} />
              <Bar dataKey="comissao" name="Comissão" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* GRÁFICO 4: Distribuição de Saídas */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-80 flex flex-col">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1">Distribuição de Saídas</h3>
          <p className="text-[10px] text-slate-400 font-bold mb-4">Custos Operacionais vs Retirada Pessoal</p>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={dadosSaidas} cx="50%" cy="50%" 
                  innerRadius={60} outerRadius={90} 
                  paddingAngle={5} dataKey="valor" stroke="none"
                >
                  {dadosSaidas.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CORES_PIE[index % CORES_PIE.length]} />
                  ))}
                </Pie>
                <Tooltip content={<TooltipMoeda />} />
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;