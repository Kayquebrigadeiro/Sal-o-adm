import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import { FinancialEngine } from '../services/FinancialEngine';
import { TAXA_MAQUININHA_PADRAO } from '../services/financialConstants';
import { Clock, User, Scissors, DollarSign, X, CheckCircle2, AlertCircle, AlertTriangle, UserPlus, List, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtPct = (v) => `${Number(v || 0).toFixed(1)}%`;

const HORARIOS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '13:00', '13:30', '14:00',
  '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
  '17:30', '18:00', '18:30', '19:00'
];

export default function Agenda({ salaoId, role }) {
  const { showToast } = useToast();

  // ─── Dados do Supabase ───
  const [profissionais, setProfissionais] = useState([]);
  const [procedimentos, setProcedimentos] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [config, setConfig] = useState({ custoFixo: 0, taxaMaq: TAXA_MAQUININHA_PADRAO });
  const [loading, setLoading] = useState(true);

  // ─── Data selecionada ───
  const [dataSelecionada, setDataSelecionada] = useState(new Date().toISOString().split('T')[0]);

  // ─── Modal ───
  const [modalAberto, setModalAberto] = useState(false);
  const [selecao, setSelecao] = useState({ hora: '', profId: null, profNome: '' });
  const [salvando, setSalvando] = useState(false);

  // ─── Formulário ───
  const [novo, setNovo] = useState({ cliente: '', procId: '', tamanho: 'P', valor: '', obs: '' });
  const [ignorarPrejuizo, setIgnorarPrejuizo] = useState(false);

  // ─── Engine ───
  const engine = useMemo(() => new FinancialEngine({
    custoFixoPorAtendimento: config.custoFixo,
    taxaMaquininhaPct: config.taxaMaq,
  }), [config]);

  // ─── Carregar dados iniciais ───
  useEffect(() => {
    if (!salaoId) return;
    const carregar = async () => {
      setLoading(true);
      try {
        const [cfgRes, profRes, procRes] = await Promise.all([
          supabase.from('configuracoes').select('custo_fixo_por_atendimento, taxa_maquininha_pct').eq('salao_id', salaoId).single(),
          supabase.from('profissionais').select('id, nome, cargo').eq('salao_id', salaoId).eq('ativo', true).order('nome'),
          supabase.from('procedimentos').select('id, nome, categoria, requer_comprimento, preco_p, preco_m, preco_g, custo_variavel, porcentagem_profissional').eq('salao_id', salaoId).eq('ativo', true).order('nome'),
        ]);

        if (cfgRes.data) {
          setConfig({
            custoFixo: Number(cfgRes.data.custo_fixo_por_atendimento) || 0,
            taxaMaq: Number(cfgRes.data.taxa_maquininha_pct) || TAXA_MAQUININHA_PADRAO,
          });
        }
        setProfissionais(profRes.data || []);
        setProcedimentos(procRes.data || []);
      } catch (err) {
        showToast('Erro ao carregar agenda', 'error');
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, [salaoId]);

  // ─── Carregar atendimentos da data ───
  useEffect(() => {
    if (!salaoId || !dataSelecionada) return;
    carregarAtendimentos();
  }, [salaoId, dataSelecionada]);

  const carregarAtendimentos = async () => {
    const { data } = await supabase
      .from('atendimentos')
      .select('*, profissionais(nome), procedimentos(nome, categoria)')
      .eq('salao_id', salaoId)
      .eq('data', dataSelecionada)
      .neq('status', 'CANCELADO')
      .order('horario');
    setAgendamentos(data || []);
  };

  // ─── Navegação de data ───
  const mudarDia = (delta) => {
    const d = new Date(dataSelecionada + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    setDataSelecionada(d.toISOString().split('T')[0]);
  };
  const hoje = () => setDataSelecionada(new Date().toISOString().split('T')[0]);
  const ehHoje = dataSelecionada === new Date().toISOString().split('T')[0];

  const fmtDataCompleta = (d) => {
    const dt = new Date(d + 'T12:00:00');
    return dt.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  // ─── Preview financeiro em tempo real ───
  const previewFinanceiro = useMemo(() => {
    const proc = procedimentos.find(p => p.id === novo.procId);
    if (!proc || !novo.valor) return null;

    const profSelecionado = profissionais.find(p => p.id === selecao.profId);
    const cargo = profSelecionado?.cargo || 'FUNCIONARIO';

    return engine.calcularAtendimento({
      valorCobrado: Number(novo.valor),
      categoriaProcedimento: proc.categoria || 'CABELO',
      percentualComissao: Number(proc.porcentagem_profissional),
      custoProduto: Number(proc.custo_variavel) || 0,
      cargoProfissional: cargo,
    });
  }, [engine, novo.procId, novo.valor, novo.tamanho, selecao.profId, procedimentos, profissionais]);

  // ─── Abrir modal ───
  const abrirAgendamento = (hora, profId) => {
    const prof = profissionais.find(p => p.id === profId);
    setSelecao({ hora, profId, profNome: prof?.nome || '' });
    setNovo({ cliente: '', procId: '', tamanho: 'P', valor: '', obs: '' });
    setIgnorarPrejuizo(false);
    setModalAberto(true);
  };

  // ─── Selecionar procedimento ───
  const selecionarProcedimento = (procId) => {
    const proc = procedimentos.find(p => p.id === procId);
    if (!proc) return;
    const preco = Number(proc.preco_p) || 0;
    setNovo(prev => ({ ...prev, procId, valor: preco }));
  };

  // ─── Selecionar tamanho ───
  const selecionarTamanho = (tamanho) => {
    const proc = procedimentos.find(p => p.id === novo.procId);
    if (!proc) { setNovo(prev => ({ ...prev, tamanho })); return; }
    const precoMap = { P: proc.preco_p, M: proc.preco_m, G: proc.preco_g };
    setNovo(prev => ({ ...prev, tamanho, valor: Number(precoMap[tamanho]) || prev.valor }));
  };

  // ─── Salvar atendimento ───
  const salvar = async () => {
    if (!novo.cliente.trim()) return showToast('Digite o nome da cliente!', 'error');
    if (!novo.procId) return showToast('Selecione o procedimento!', 'error');

    setSalvando(true);
    try {
      const proc = procedimentos.find(p => p.id === novo.procId);

      const dados = {
        salao_id: salaoId,
        data: dataSelecionada,
        horario: selecao.hora,
        profissional_id: selecao.profId,
        procedimento_id: novo.procId,
        comprimento: proc?.requer_comprimento ? novo.tamanho : null,
        cliente: novo.cliente.toUpperCase(),
        valor_cobrado: Number(novo.valor) || 0,
        valor_pago: 0,
        status: 'AGENDADO',
        obs: novo.obs || null,
      };

      const { error } = await supabase.from('atendimentos').insert(dados);
      if (error) throw error;

      showToast('Atendimento agendado!', 'success');
      setModalAberto(false);
      carregarAtendimentos();
    } catch (err) {
      showToast(`Erro: ${err.message}`, 'error');
    } finally {
      setSalvando(false);
    }
  };

  // ─── Encontrar agendamento na grade ───
  const getAgendamento = (hora, profId) => {
    return agendamentos.find(a => a.horario?.substring(0, 5) === hora && a.profissional_id === profId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-50 min-h-screen font-sans">
      {/* ═══ HEADER COM NAVEGAÇÃO DE DATA ═══ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Agenda de Controle</h1>
          <p className="text-slate-500 text-sm">Clique no horário para lançar o faturamento.</p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => mudarDia(-1)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
            <ChevronLeft size={18} className="text-slate-600" />
          </button>
          <button onClick={hoje}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${ehHoje ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            {ehHoje ? '📅 Hoje' : fmtDataCompleta(dataSelecionada)}
          </button>
          <input type="date" value={dataSelecionada} onChange={e => setDataSelecionada(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
          <button onClick={() => mudarDia(1)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
            <ChevronRight size={18} className="text-slate-600" />
          </button>
        </div>
      </div>

      {/* ═══ GRADE DE AGENDA ═══ */}
      {profissionais.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <User size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-bold">Nenhum profissional cadastrado</p>
          <p className="text-xs text-slate-400 mt-1">Adicione profissionais nas Configurações</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-3 border-r border-slate-700 text-xs w-16 text-center">HORA</th>
                {profissionais.map(p => (
                  <th key={p.id} className="p-3 border-r border-slate-700 text-xs uppercase tracking-widest text-center">
                    {p.nome}
                    <span className="block text-[9px] font-normal text-slate-400 mt-0.5 normal-case">
                      {p.cargo === 'PROPRIETARIO' ? '👑 Proprietária' : '👤 Funcionário(a)'}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HORARIOS.map(hora => (
                <tr key={hora} className="group">
                  <td className="p-1.5 border border-slate-100 bg-slate-50 text-center font-bold text-slate-400 text-[10px]">{hora}</td>
                  {profissionais.map(prof => {
                    const agend = getAgendamento(hora, prof.id);
                    return (
                      <td
                        key={prof.id}
                        onClick={() => !agend && abrirAgendamento(hora, prof.id)}
                        className={`p-1 border border-slate-100 h-14 cursor-pointer transition-all ${!agend ? 'hover:bg-emerald-50/60' : ''}`}
                      >
                        {agend ? (
                          <div className={`h-full w-full rounded-lg p-1.5 text-[10px] relative overflow-hidden ${
                            agend.status === 'EXECUTADO'
                              ? 'bg-emerald-800 text-white'
                              : 'bg-slate-800 text-white'
                          }`}>
                            <div className="font-bold truncate">{agend.cliente}</div>
                            <div className="text-slate-300 truncate">
                              {agend.procedimentos?.nome} {agend.comprimento ? `(${agend.comprimento})` : ''}
                            </div>
                            <div className={`absolute bottom-0.5 right-1 px-1 rounded text-[9px] font-black ${
                              Number(agend.lucro_liquido) >= 0 ? 'bg-emerald-500/80' : 'bg-red-500/80'
                            }`}>
                              {fmt(agend.lucro_liquido)}
                            </div>
                            {agend.status === 'EXECUTADO' && (
                              <CheckCircle2 size={10} className="absolute top-1 right-1 text-emerald-300" />
                            )}
                          </div>
                        ) : (
                          <div className="h-full w-full flex items-center justify-center opacity-0 group-hover:opacity-30 transition-opacity">
                            <PlusIcon />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ PAINEL LATERAL (MODAL) ═══ */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-end z-50" onClick={() => setModalAberto(false)}>
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto animate-slideInRight"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-xl font-black text-slate-900">Novo Atendimento</h2>
                <p className="text-xs text-slate-500 font-bold uppercase">
                  {selecao.hora} — {selecao.profNome}
                  <span className="text-slate-300 ml-2">{fmtDataCompleta(dataSelecionada)}</span>
                </p>
              </div>
              <button onClick={() => setModalAberto(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X /></button>
            </div>

            <div className="space-y-5">

              {/* CLIENTE */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Cliente</label>
                <input
                  type="text"
                  placeholder="NOME DA CLIENTE"
                  className="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-emerald-500 font-bold text-sm uppercase transition-colors"
                  value={novo.cliente}
                  onChange={e => setNovo({...novo, cliente: e.target.value.toUpperCase()})}
                />
              </div>

              {/* PROCEDIMENTO */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Procedimento</label>
                <select
                  className="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-emerald-500 font-bold text-sm bg-white transition-colors"
                  value={novo.procId}
                  onChange={e => selecionarProcedimento(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {procedimentos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>

              {/* TAMANHO */}
              {(() => {
                const proc = procedimentos.find(p => p.id === novo.procId);
                if (!proc || !proc.requer_comprimento) return null;
                return (
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Comprimento</label>
                    <div className="flex gap-3">
                      {['P', 'M', 'G'].map(t => (
                        <button key={t}
                          onClick={() => selecionarTamanho(t)}
                          className={`flex-1 py-3 rounded-xl font-black border-2 transition-all ${
                            novo.tamanho === t
                              ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                              : 'border-slate-200 text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          {t === 'P' ? 'Curto' : t === 'M' ? 'Médio' : 'Longo'}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* VALOR + PREVIEW FINANCEIRO */}
              <div className={`p-4 rounded-2xl border-2 transition-all duration-300 ${
                previewFinanceiro?.prejuizo && !ignorarPrejuizo
                  ? 'bg-red-50 border-red-400'
                  : 'bg-slate-50 border-transparent'
              }`}>
                <div className="flex justify-between items-start mb-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Valor Cobrado (R$)</label>
                  {(() => {
                    const proc = procedimentos.find(p => p.id === novo.procId);
                    if (!proc) return null;
                    const precoMap = { P: proc.preco_p, M: proc.preco_m, G: proc.preco_g };
                    const sugerido = precoMap[novo.tamanho];
                    if (!sugerido) return null;
                    return (
                      <button onClick={() => setNovo(prev => ({ ...prev, valor: Number(sugerido) }))}
                        className="text-[9px] font-black bg-slate-200 text-slate-600 px-2 py-1 rounded hover:bg-slate-300 transition-colors">
                        SUGERIDO: {fmt(sugerido)}
                      </button>
                    );
                  })()}
                </div>
                <input
                  type="number" step="0.01"
                  className={`w-full bg-transparent text-3xl font-black outline-none ${
                    previewFinanceiro?.prejuizo ? 'text-red-600' : 'text-slate-900'
                  }`}
                  value={novo.valor}
                  onChange={e => setNovo({...novo, valor: e.target.value})}
                  placeholder="0,00"
                />

                {/* Desmembramento do Motor Financeiro */}
                {previewFinanceiro && (
                  <div className={`mt-4 pt-4 border-t ${previewFinanceiro.prejuizo ? 'border-red-200' : 'border-slate-200'}`}>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Lucro Líquido</p>
                        <p className={`text-xl font-black ${ignorarPrejuizo ? 'text-slate-400' : previewFinanceiro.prejuizo ? 'text-red-600' : 'text-emerald-600'}`}>
                          {ignorarPrejuizo ? '—' : fmt(previewFinanceiro.lucroLiquido)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Margem</p>
                        <p className={`text-xl font-black ${previewFinanceiro.margemReal < 0 ? 'text-red-600' : previewFinanceiro.margemReal < 15 ? 'text-amber-500' : 'text-emerald-600'}`}>
                          {fmtPct(previewFinanceiro.margemReal)}
                        </p>
                      </div>
                    </div>

                    {/* Detalhamento centavo a centavo */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400 font-medium">
                      <span>Maquininha: <b className="text-slate-600">{fmt(previewFinanceiro.valorMaquininha)}</b></span>
                      {previewFinanceiro.valorComissao > 0 && (
                        <span>Comissão: <b className="text-slate-600">{fmt(previewFinanceiro.valorComissao)}</b></span>
                      )}
                      <span>Custo Fixo: <b className="text-slate-600">{fmt(previewFinanceiro.custoFixo)}</b></span>
                      <span>Material: <b className="text-slate-600">{fmt(previewFinanceiro.custoProduto)}</b></span>
                    </div>

                    {/* Alerta de prejuízo */}
                    {previewFinanceiro.prejuizo && !ignorarPrejuizo && (
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-red-600">
                          <AlertTriangle size={14} />
                          <span className="text-[10px] font-black uppercase">Prejuízo!</span>
                        </div>
                        <button onClick={() => setIgnorarPrejuizo(true)}
                          className="text-[9px] font-black text-slate-400 hover:text-slate-600 underline uppercase">
                          Ignorar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* OBS */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Observação</label>
                <input type="text" placeholder="Opcional..."
                  className="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-emerald-500 text-sm transition-colors"
                  value={novo.obs} onChange={e => setNovo({...novo, obs: e.target.value})} />
              </div>

              {/* BOTÃO SALVAR */}
              <button
                onClick={salvar}
                disabled={salvando}
                className={`w-full py-4 rounded-2xl font-black text-lg transition-all shadow-xl flex items-center justify-center gap-2 ${
                  salvando ? 'bg-slate-300 text-slate-500 cursor-not-allowed' :
                  previewFinanceiro?.prejuizo
                    ? 'bg-red-600 text-white shadow-red-200 hover:bg-red-700'
                    : 'bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-700'
                }`}
              >
                {salvando ? (
                  <><Loader2 size={20} className="animate-spin" /> Salvando...</>
                ) : previewFinanceiro?.prejuizo ? (
                  'CONFIRMAR MESMO COM PREJUÍZO'
                ) : (
                  'CONFIRMAR ATENDIMENTO'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-200">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);