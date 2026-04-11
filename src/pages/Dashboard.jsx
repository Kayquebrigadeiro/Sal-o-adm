import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine, ComposedChart, Line, Legend
} from 'recharts';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState({
    faturamentoMensal: [],
    rankingPossivel: [],
    lucroReal: [],
    rendimentoEquipe: [],
    comparativoGeral: [],
    kpis: { bruto: 0, possivel: 0, real: 0 }
  });
  const [custoFixoPorAtendimento, setCustoFixoPorAtendimento] = useState(29);
  const [alertasPrejuizo, setAlertasPrejuizo] = useState([]);

  // Cores da sua Planilha
  const COLORS = {
    primary: '#E85D24', // Laranja/Vermelho principal
    danger: '#A32D2D',  // Vermelho escuro de prejuízo
    teta: '#BA7517',    // Destaque da Teta
    light: '#E6F1FB'
  };

  // 🎯 Formatação BRL
  const formatarBRL = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor);
  };

  // 🧮 Cálculo do Lucro Real com Fórmula Corrigida
  const calcularLucroReal = (valorBruto, comissaoProfissional = 0.60, taxaMaquininha = 0.05) => {
    const taxaSaida = valorBruto * taxaMaquininha;          // Taxa (5%) sai primeiro
    const valorBaseComissao = valorBruto - taxaSaida;       // Base para comissão
    const comissao = valorBaseComissao * comissaoProfissional; // Comissão da funcionária
    const lucro = valorBruto - taxaSaida - custoFixoPorAtendimento - comissao; // Lucro final
    
    return {
      bruto: valorBruto,
      taxaSaida,
      valorBase: valorBaseComissao,
      comissao,
      custoFixo: custoFixoPorAtendimento,
      lucro
    };
  };

  useEffect(() => {
    fetchDadosSaaS();
  }, []);

  const fetchDadosSaaS = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: perfil } = await supabase
        .from('perfis_acesso')
        .select('salao_id')
        .eq('auth_user_id', user?.id)
        .single();
      
      const salaoId = perfil?.salao_id;
      if (!salaoId) return;

      // 📋 Busca configurações do salão (custo_fixo_por_atendimento)
      const { data: configData } = await supabase
        .from('configuracoes')
        .select('custo_fixo_por_atendimento')
        .eq('salao_id', salaoId)
        .single();
      
      const custoFixo = configData?.custo_fixo_por_atendimento || 29;
      setCustoFixoPorAtendimento(custoFixo);

      // 🔄 Busca dados reais dos atendimentos para cálculos precisos
      const { data: atendimentos } = await supabase
        .from('atendimentos')
        .select('valor_cobrado, procedimento_id, profissional_id, data')
        .eq('salao_id', salaoId)
        .eq('status', 'EXECUTADO')
        .eq('pago', true);

      const { data: procedimentos } = await supabase
        .from('procedimentos')
        .select('id, nome')
        .eq('salao_id', salaoId);

      const { data: profissionais } = await supabase
        .from('profissionais')
        .select('id, nome')
        .eq('salao_id', salaoId);

      // 🧮 Processa dados com fórmula corrigida
      let faturamentoTotal = 0;
      let lucroTotalPossivel = 0;
      let lucroTotalReal = 0;
      const mesesMap = {};
      const procedimentosMap = {};
      const profissionaisMap = {};
      const servicosComPrejuizo = [];

      atendimentos?.forEach(atend => {
        const calc = calcularLucroReal(atend.valor_cobrado);
        
        // 🚨 Detecta serviços com prejuízo
        if (calc.lucro < 0) {
          const proc = procedimentos?.find(p => p.id === atend.procedimento_id);
          servicosComPrejuizo.push({
            procedimento_nome: proc?.nome || 'Desconhecido',
            valor_cobrado: atend.valor_cobrado,
            lucro: calc.lucro
          });
        }

        // KPIs
        faturamentoTotal += calc.bruto;
        lucroTotalPossivel += (calc.bruto - calc.taxaSaida - calc.custoFixo); // Sem comissão
        lucroTotalReal += calc.lucro;

        // Faturamento por mês
        const mesAtend = new Date(atend.data).toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
        if (!mesesMap[mesAtend]) mesesMap[mesAtend] = { mes: mesAtend, valor: 0, qtd: 0 };
        mesesMap[mesAtend].valor += calc.bruto;
        mesesMap[mesAtend].qtd += 1;

        // Lucro real por procedimento
        const proc = procedimentos?.find(p => p.id === atend.procedimento_id);
        if (proc) {
          if (!procedimentosMap[proc.nome]) procedimentosMap[proc.nome] = 0;
          procedimentosMap[proc.nome] += calc.lucro;
        }

        // Rendimento por profissional
        const prof = profissionais?.find(p => p.id === atend.profissional_id);
        if (prof) {
          if (!profissionaisMap[prof.nome]) profissionaisMap[prof.nome] = 0;
          profissionaisMap[prof.nome] += calc.comissao;
        }
      });

      // Converte maps em arrays
      const faturamentoMensal = Object.values(mesesMap).sort((a, b) => 
        new Date(a.mes) - new Date(b.mes)
      );

      const lucroReal = Object.entries(procedimentosMap)
        .map(([nome, valor]) => ({ nome, valor }))
        .sort((a, b) => b.valor - a.valor);

      const rendimentoEquipe = Object.entries(profissionaisMap)
        .map(([nome, valor]) => ({ nome, valor }))
        .sort((a, b) => b.valor - a.valor);

      const rankingPossivel = procedimentos
        ?.map(p => ({
          nome: p.nome,
          valor: (atendimentos?.filter(a => a.procedimento_id === p.id).length || 0) * 
                 (atendimentos?.filter(a => a.procedimento_id === p.id).reduce((acc, a) => acc + a.valor_cobrado, 0) || 0) / 
                 (atendimentos?.filter(a => a.procedimento_id === p.id).length || 1)
        }))
        .filter(p => p.valor > 0)
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 4) || [];

      // ✅ Atualiza estado com dados reais
      setDados({
        kpis: { bruto: faturamentoTotal, possivel: lucroTotalPossivel, real: lucroTotalReal },
        faturamentoMensal,
        rankingPossivel,
        lucroReal,
        rendimentoEquipe,
        comparativoGeral: [
          { label: 'Lucro possível', valor: lucroTotalPossivel },
          { label: 'Lucro real', valor: lucroTotalReal }
        ]
      });

      // 🔴 Atualiza alertas de prejuízo
      setAlertasPrejuizo(servicosComPrejuizo);

    } catch (e) { 
      console.error('Erro ao carregar Dashboard:', e); 
    } finally { 
      setLoading(false); 
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-400">Processando fechamento...</div>;

  return (
    <div className="bg-white min-h-screen p-4 md:p-8 font-sans">
      
      {/* 🚨 BANNER DE ALERTA CRÍTICO — SANGRAMENTO DE CAIXA */}
      {alertasPrejuizo.length > 0 && (
        <div className="mb-8 bg-red-600 text-white p-5 rounded-2xl shadow-lg border-4 border-red-800 animate-bounce">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-5xl flex-shrink-0">🚨</span>
              <div>
                <h3 className="text-xl font-bold uppercase tracking-tighter">
                  Alerta de Sangramento de Caixa!
                </h3>
                <p className="text-red-100 text-sm mt-1">
                  Os procedimentos abaixo estão custando mais caro do que o valor cobrado:
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {[...new Set(alertasPrejuizo.map(p => p.procedimento_nome))].map(nome => (
                    <span key={nome} className="bg-white text-red-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm flex-shrink-0">
                      {nome}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-right hidden md:block text-xs opacity-90 flex-shrink-0">
              <p className="font-semibold">Ajuste os preços ou reduza o custo de material imediatamente!</p>
            </div>
          </div>
        </div>
      )}
      
      {/* KPIs DO TOPO (Estilo Field da Planilha) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold">Total faturado bruto</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{formatarBRL(dados.kpis.bruto)}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold">Lucro possível</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1 text-gray-400">{formatarBRL(dados.kpis.possivel)}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 ring-2 ring-emerald-500/20">
          <p className="text-[11px] uppercase tracking-wider text-emerald-600 font-bold">Lucro real</p>
          <p className={`text-2xl font-semibold mt-1 ${dados.kpis.real >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {formatarBRL(dados.kpis.real)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* GRÁFICO 1 — Faturamento Mensal */}
        <section>
          <h2 className="text-[13px] font-medium text-gray-400 uppercase tracking-widest border-b pb-2 mb-4">Gráfico 1 — Valor faturado bruto por mês</h2>
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <h3 className="text-base font-medium text-gray-800">Faturamento + Quantidade</h3>
            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dados.faturamentoMensal}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#999'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#999'}} tickFormatter={v => `R$${(v/1000).toFixed(1)}k`} />
                  <Tooltip cursor={{fill: '#f8f8f8'}} formatter={(v) => [formatarBRL(v), 'Faturamento']} />
                  <Bar dataKey="valor" fill={COLORS.primary} radius={[4, 4, 0, 0]} label={{ position: 'top', fill: '#E85D24', fontSize: 10, formatter: (v, i) => `${dados.faturamentoMensal[i.index].qtd} at.` }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* GRÁFICO 3 — Lucro Real (Com alerta de barras negativas) */}
        <section>
          <h2 className="text-[13px] font-medium text-gray-400 uppercase tracking-widest border-b pb-2 mb-4">Gráfico 3 — Lucro real por procedimento</h2>
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <h3 className="text-base font-medium text-gray-800">O que cada serviço realmente deu de lucro</h3>
            <p className="text-xs text-gray-500 mt-1">Fórmula: Bruto - Taxa(5%) - Custo({formatarBRL(custoFixoPorAtendimento)}) - Comissão(60%)</p>
            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dados.lucroReal} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <YAxis dataKey="nome" type="category" width={90} axisLine={false} tickLine={false} tick={{fontSize: 11}} />
                  <Tooltip formatter={(v) => [formatarBRL(v), 'Lucro']} />
                  <ReferenceLine x={0} stroke="#000" strokeWidth={1} />
                  <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                    {dados.lucroReal.map((entry, index) => (
                      <Cell key={index} fill={entry.valor < 0 ? COLORS.danger : COLORS.primary} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {dados.lucroReal.some(v => v.valor < 0) && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100">
                ⚠️ <strong>Atenção:</strong> Serviços em vermelho estão gerando prejuízo. Revise preço ou custos.
              </div>
            )}
          </div>
        </section>

        {/* GRÁFICO 4 — Rendimento Equipe */}
        <section>
          <h2 className="text-[13px] font-medium text-gray-400 uppercase tracking-widest border-b pb-2 mb-4">Gráfico 4 — Rendimento líquido por funcionária</h2>
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dados.rendimentoEquipe}>
                  <XAxis dataKey="nome" axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(v) => [formatarBRL(v), 'Comissão']} />
                  <Bar dataKey="valor" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 11, formatter: (v) => formatarBRL(v).replace('R$ ', '') }}>
                    {dados.rendimentoEquipe.map((entry, index) => (
                      <Cell key={index} fill={entry.nome === 'Teta' ? COLORS.teta : COLORS.primary} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* GRÁFICO 5 — Possível vs Real */}
        <section>
          <h2 className="text-[13px] font-medium text-gray-400 uppercase tracking-widest border-b pb-2 mb-4">Gráfico 5 — Lucro possível vs real</h2>
          <div className="bg-white border border-gray-100 rounded-xl p-5 flex items-center">
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dados.comparativoGeral} barSize={60}>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(v) => [formatarBRL(v), 'Lucro']} />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]} label={{ position: 'top', fontSize: 10, formatter: (v) => formatarBRL(v).replace('R$ ', '').split(',')[0] }}>
                    <Cell fill={COLORS.primary} />
                    <Cell fill={COLORS.teta} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Dashboard;