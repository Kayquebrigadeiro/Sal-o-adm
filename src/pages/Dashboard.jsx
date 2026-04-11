import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [fechamento, setFechamento] = useState({});
  const [rankingProcedimentos, setRankingProcedimentos] = useState([]);
  const [rendimentoEquipe, setRendimentoEquipe] = useState([]);
  const [gastosPessoais, setGastosPessoais] = useState({});

  // Cores para o gráfico de pizza
  const CORES = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: perfil } = await supabase.from('perfis_acesso').select('salao_id').eq('auth_user_id', user?.id).single();
      const salaoId = perfil?.salao_id;

      if (!salaoId) return;

      // 1. Busca o Fechamento do Mês Atual (Receita, Lucro, Despesas)
      const { data: fechamentoData } = await supabase
        .from('fechamento_mensal')
        .select('*')
        .eq('salao_id', salaoId)
        .limit(1)
        .single();
      setFechamento(fechamentoData || {});

      // 2. Busca o Ranking de Procedimentos (Gráfico de Pizza e Barras)
      const { data: rankingData } = await supabase
        .from('ranking_procedimentos')
        .select('*')
        .eq('salao_id', salaoId);
      setRankingProcedimentos(rankingData || []);

      // 3. Busca Rendimento por Profissional
      const { data: rendimentoData } = await supabase
        .from('rendimento_por_profissional')
        .select('*')
        .eq('salao_id', salaoId);
      setRendimentoEquipe(rendimentoData || []);

      // 4. Busca os Gastos Pessoais (Para o cálculo do Pró-labore)
      const { data: gastosData } = await supabase
        .from('gastos_pessoais_resumo')
        .select('*')
        .eq('salao_id', salaoId)
        .limit(1)
        .single();
      
      const { data: configData } = await supabase
        .from('configuracoes')
        .select('prolabore_mensal')
        .eq('salao_id', salaoId)
        .single();

      setGastosPessoais({
        real: gastosData?.total_gastos || 0,
        estipulado: configData?.prolabore_mensal || 0
      });

    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-500 font-medium">Carregando Inteligência Financeira...</div>;

  const deficitProlabore = gastosPessoais.estipulado - gastosPessoais.real;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Painel Financeiro</h1>
        <p className="text-gray-500">Acompanhe a saúde do seu salão em tempo real.</p>
      </div>

      {/* CARDS DE INDICADORES (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Líquido do Mês */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-500">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Líquido do Mês</h3>
          <p className="text-3xl font-bold text-slate-800">R$ {fechamento.lucro_liquido_atendimentos || '0.00'}</p>
        </div>

        {/* Faturamento Bruto */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Faturamento Bruto</h3>
          <p className="text-3xl font-bold text-slate-800">R$ {fechamento.receita_bruta || '0.00'}</p>
        </div>

        {/* Saúde da Empresa */}
        <div className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 ${fechamento.saude_financeira >= 0 ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Saúde da Empresa</h3>
          <p className={`text-3xl font-bold ${fechamento.saude_financeira >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            R$ {fechamento.saude_financeira || '0.00'}
          </p>
        </div>

        {/* Pró-labore Real vs Estipulado */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-purple-500">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Pró-labore (Real vs Estipulado)</h3>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-slate-800">R$ {gastosPessoais.real}</p>
            <p className="text-sm text-gray-400 mb-1">/ {gastosPessoais.estipulado}</p>
          </div>
          <p className={`text-xs mt-2 font-medium ${deficitProlabore >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {deficitProlabore >= 0 ? `Sobra: R$ ${deficitProlabore}` : `Déficit: R$ ${Math.abs(deficitProlabore)}`}
          </p>
        </div>
      </div>

      {/* ÁREA DE GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* GRÁFICO 1: Quantitativo de Procedimentos (Pizza) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Serviços Mais Feitos</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={rankingProcedimentos} 
                  dataKey="quantidade" 
                  nameKey="procedimento" 
                  cx="50%" cy="50%" 
                  outerRadius={80} 
                  label
                >
                  {rankingProcedimentos.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value) => [`${value} feitos`, 'Quantidade']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 2: Rendimento por Profissional (Barras) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Rendimento por Profissional</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rendimentoEquipe}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="profissional" />
                <YAxis />
                <RechartsTooltip formatter={(value) => [`R$ ${value}`, 'Valor Gerado']} />
                <Bar dataKey="rendimento_variavel" name="Comissão/Rendimento" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 3: Lucro do Procedimento (Real vs Possível) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Lucro por Procedimento (Possível vs Real)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rankingProcedimentos}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="procedimento" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="receita_total" name="Receita Bruta" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lucro_total" name="Lucro Real" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;