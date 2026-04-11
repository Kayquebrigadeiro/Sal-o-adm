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

  // Cores da sua Planilha
  const COLORS = {
    primary: '#E85D24', // Laranja/Vermelho principal
    danger: '#A32D2D',  // Vermelho escuro de prejuízo
    teta: '#BA7517',    // Destaque da Teta
    light: '#E6F1FB'
  };

  useEffect(() => {
    fetchDadosSaaS();
  }, []);

  const fetchDadosSaaS = async () => {
    setLoading(true);
    try {
      // 1. Busca os dados reais das Views do Supabase
      // Exemplo: const { data: faturamento } = await supabase.from('v_faturamento_mensal').select('*');
      
      // Para visualização do layout com os seus dados da planilha:
      setDados({
        kpis: { bruto: 125098, possivel: 20830, real: 19384 },
        faturamentoMensal: [
            { mes: 'jan', valor: 7106, qtd: 65 }, { mes: 'fev', valor: 12483, qtd: 98 },
            { mes: 'mar', valor: 15417, qtd: 120 }, { mes: 'abr', valor: 12176, qtd: 110 },
            { mes: 'mai', valor: 14819, qtd: 135 }, { mes: 'jun', valor: 14003, qtd: 128 },
            { mes: 'jul', valor: 15885, qtd: 140 }, { mes: 'ago', valor: 13764, qtd: 125 },
            { mes: 'set', valor: 16066, qtd: 142 }
        ],
        rankingPossivel: [
            { nome: 'Progressiva', valor: 23570 }, { nome: 'Unhas Gel', valor: 18235 },
            { nome: 'Botox', valor: 14260 }, { nome: 'Ext. cílios', valor: 10040 }
        ].sort((a,b) => b.valor - a.valor),
        lucroReal: [
            { nome: 'Progressiva', valor: 9225.82 }, { nome: 'Botox', valor: 5181.80 },
            { nome: 'Unhas Gel', valor: -250.35 }, { nome: 'Luzes', valor: -33.49 },
            { nome: 'Kit Lavatorio', valor: -751.57 }
        ].sort((a,b) => b.valor - a.valor),
        rendimentoEquipe: [
            { nome: 'Teta', valor: 26968 }, { nome: 'Mirelly', valor: 10557 },
            { nome: 'Geovana', valor: 4494 }, { nome: 'Yara', valor: 1181 }
        ],
        comparativoGeral: [
            { label: 'Lucro possível', valor: 26127 },
            { label: 'Lucro real', valor: 24307 }
        ]
      });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (loading) return <div className="p-10 text-center text-gray-400">Processando fechamento...</div>;

  return (
    <div className="bg-white min-h-screen p-4 md:p-8 font-sans">
      
      {/* KPIs DO TOPO (Estilo Field da Planilha) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold">Total faturado bruto</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">R$ {dados.kpis.bruto.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold">Lucro possível</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1 text-gray-400">R$ {dados.kpis.possivel.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 ring-2 ring-emerald-500/20">
          <p className="text-[11px] uppercase tracking-wider text-emerald-600 font-bold">Lucro real</p>
          <p className="text-2xl font-semibold text-emerald-700 mt-1">R$ {dados.kpis.real.toLocaleString()}</p>
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
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#999'}} tickFormatter={v => `R$${v/1000}k`} />
                  <Tooltip cursor={{fill: '#f8f8f8'}} formatter={(v) => [`R$ ${v.toLocaleString()}`, 'Faturamento']} />
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
            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dados.lucroReal} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <YAxis dataKey="nome" type="category" width={90} axisLine={false} tickLine={false} tick={{fontSize: 11}} />
                  <Tooltip />
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
                ⚠️ <strong>Atenção:</strong> Serviços em vermelho estão com custos superiores à receita.
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
                  <Tooltip />
                  <Bar dataKey="valor" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 11 }}>
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
                  <Tooltip />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
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