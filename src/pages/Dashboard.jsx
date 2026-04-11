import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Dashboard({ salaoId }) {
  const [resumo, setResumo] = useState(null);
  const [profissionais, setProfissionais] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    // Só tenta buscar os dados se o salaoId já estiver disponível
    if (salaoId) {
      fetchDados();
    }
  }, [salaoId]);

  async function fetchDados() {
    setCarregando(true);
    setErro(null);
    
    try {
      // ✅ Consultas Paralelas (Muito mais rápido!)
      const [
        { data: dataFechamento, error: erro1 },
        { data: dataProfs, error: erro2 },
        { data: dataRanking, error: erro3 }
      ] = await Promise.all([
        supabase.from('fechamento_mensal').select('*').eq('salao_id', salaoId).order('mes', { ascending: false }).limit(1).single(),
        supabase.from('rendimento_por_profissional').select('*').eq('salao_id', salaoId).order('faturamento_gerado', { ascending: false }),
        supabase.from('ranking_procedimentos').select('*').eq('salao_id', salaoId).limit(5)
      ]);

      if (erro1 && erro1.code !== 'PGRST116') throw erro1; // Ignora erro de "no rows" se não houver dados
      if (erro2) throw erro2;
      if (erro3) throw erro3;

      setResumo(dataFechamento || null);
      setProfissionais(dataProfs || []);
      setRanking(dataRanking || []);

    } catch (err) {
      console.error("Erro ao carregar Dashboard:", err);
      setErro("Ocorreu um erro ao carregar os dados. Tente novamente mais tarde.");
    } finally {
      setCarregando(false);
    }
  }

  if (carregando) return <div className="p-10 text-center text-slate-500">A calcular resultados...</div>;
  if (erro) return <div className="p-10 text-center text-red-500">{erro}</div>;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Painel de Gestão</h1>
        <p className="text-slate-500 text-sm">Resultados baseados em atendimentos executados e despesas pagas.</p>
      </header>

      {/* 1. CARDS DE RESUMO FINANCEIRO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Faturamento Bruto" value={resumo?.faturamento_bruto} color="blue" />
        <Card title="Lucro Real" value={resumo?.lucro_real} color="emerald" bold />
        <Card title="Lucro Possível" value={resumo?.lucro_possivel} color="slate" help="Se tudo fosse pago" />
        <Card title="Pendências (Fiado)" value={resumo?.total_pendente} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. RENDIMENTO DA EQUIPA */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="font-bold text-slate-800 mb-4">Desempenho da Equipa</h2>
          <div className="space-y-4">
            {profissionais.length === 0 && <p className="text-sm text-slate-400 italic">Nenhum atendimento registado.</p>}
            {profissionais.map(p => (
              <div key={p.profissional} className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="font-medium text-slate-700">{p.profissional}</p>
                  <p className="text-xs text-slate-400">{p.atendimentos} atendimentos</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">R$ {p.faturamento_gerado?.toFixed(2)}</p>
                  <p className="text-[10px] text-emerald-600">Comissão: R$ {p.rendimento_bruto?.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. RANKING DE PROCEDIMENTOS */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="font-bold text-slate-800 mb-4">Mais Vendidos</h2>
          <div className="space-y-4">
            {ranking.length === 0 && <p className="text-sm text-slate-400 italic">Nenhum serviço registado.</p>}
            {ranking.map(proc => {
              // ✅ Prevenção contra Divisão por Zero
              const pct = resumo?.faturamento_bruto 
                ? (proc.receita_total / resumo.faturamento_bruto) * 100 
                : 0;

              return (
                <div key={proc.procedimento} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">{proc.procedimento}</span>
                      <span className="font-bold">{proc.quantidade}x</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-full" 
                        style={{ width: `${Math.min(pct, 100).toFixed(1)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function Card({ title, value, color, bold, help }) {
  const colors = {
    blue: "text-blue-600 border-blue-100 bg-blue-50",
    emerald: "text-emerald-600 border-emerald-100 bg-emerald-50",
    slate: "text-slate-600 border-slate-100 bg-slate-50",
    amber: "text-amber-600 border-amber-100 bg-amber-50"
  };

  return (
    <div className={`p-5 rounded-2xl border shadow-sm ${colors[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wider opacity-70">{title}</p>
      <p className={`text-2xl ${bold ? 'font-black' : 'font-bold'} mt-1`}>
        R$ {Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </p>
      {help && <p className="text-[10px] mt-2 opacity-60 italic">{help}</p>}
    </div>
  );
}