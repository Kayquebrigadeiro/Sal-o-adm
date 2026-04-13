import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import PageHeader from '../components/PageHeader';
import { TrendingUp, Wallet, Target, AlertCircle } from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Dashboard({ salaoId }) {
  const [loading, setLoading] = useState(true);
  const [mesSelecionado, setMesSelecionado] = useState('');
  const [meses, setMeses] = useState([]);
  
  const [resumo, setResumo] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [rendimento, setRendimento] = useState([]);

  useEffect(() => {
    // Gerar últimos 12 meses
    const mesesArray = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      mesesArray.push(mes);
    }
    setMeses(mesesArray);
    setMesSelecionado(mesesArray[0]);
  }, []);

  useEffect(() => {
    if (mesSelecionado) carregarDados();
  }, [mesSelecionado, salaoId]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resumoRes, rankingRes, rendimentoRes] = await Promise.all([
        supabase.from('fechamento_mensal').select('*').eq('salao_id', salaoId).eq('mes', mesSelecionado).single(),
        supabase.from('ranking_procedimentos').select('*').eq('salao_id', salaoId).eq('mes', mesSelecionado).order('quantidade', { ascending: false }).limit(5),
        supabase.from('rendimento_por_profissional').select('*').eq('salao_id', salaoId).eq('mes', mesSelecionado)
      ]);

      setResumo(resumoRes.data || { faturamento_bruto: 0, lucro_real: 0, lucro_possivel: 0, total_pendente: 0 });
      setRanking(rankingRes.data || []);
      setRendimento(rendimentoRes.data || []);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Carregando dashboard...</div>;

  const maxReceita = Math.max(...ranking.map(r => r.receita_total || 0), 1);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <PageHeader 
        title="Dashboard" 
        subtitle="Visão geral do desempenho financeiro"
        action={
          <select
            value={mesSelecionado}
            onChange={e => setMesSelecionado(e.target.value)}
            className="border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {meses.map(m => (
              <option key={m} value={m}>
                {new Date(m + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
        }
      />

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Faturamento Bruto</p>
              <p className="text-xl font-bold text-slate-900">{fmt(resumo?.faturamento_bruto)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Wallet size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Lucro Real</p>
              <p className="text-xl font-bold text-emerald-600">{fmt(resumo?.lucro_real)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <Target size={20} className="text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Lucro Possível</p>
              <p className="text-xl font-bold text-slate-600">{fmt(resumo?.lucro_possivel)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertCircle size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Pendências</p>
              <p className="text-xl font-bold text-amber-600">{fmt(resumo?.total_pendente)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ranking Procedimentos */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Top 5 Procedimentos</h3>
        {ranking.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Nenhum procedimento realizado neste mês</p>
        ) : (
          <div className="space-y-4">
            {ranking.map((proc, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-slate-700">{proc.procedimento}</span>
                  <span className="text-sm text-slate-500">{proc.quantidade}x • {fmt(proc.receita_total)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${(proc.receita_total / maxReceita) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rendimento por Profissional */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Rendimento por Profissional</h3>
        {rendimento.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Nenhum atendimento registrado neste mês</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rendimento.map((prof, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg font-bold">{prof.profissional?.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{prof.profissional}</p>
                    <p className="text-xs text-slate-500">{prof.cargo}</p>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Atendimentos:</span>
                    <span className="font-medium">{prof.atendimentos}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Faturamento:</span>
                    <span className="font-medium">{fmt(prof.faturamento_gerado)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Comissão:</span>
                    <span className="font-medium text-emerald-600">{fmt(prof.rendimento_bruto)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
