import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import { FinancialEngine } from '../services/FinancialEngine';
import { TAXA_MAQUININHA_PADRAO } from '../services/financialConstants';
import { Clock, User, Scissors, DollarSign, X, CheckCircle2, AlertCircle, AlertTriangle, UserPlus, List, ChevronLeft, ChevronRight, Loader2, Sparkles, Search, Phone, Plus, Eye, EyeOff, Trash2, Package } from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtPct = (v) => `${Number(v || 0).toFixed(1)}%`;

// Cores por profissional (inspirado Avec/SalãoVip) — paleta profissional
const PROF_COLORS = [
  { bg: 'bg-blue-500',     light: 'bg-blue-50',     text: 'text-blue-700',     border: 'border-blue-200',    hover: 'hover:bg-blue-50/60' },
  { bg: 'bg-sky-500',      light: 'bg-sky-50',      text: 'text-sky-700',      border: 'border-sky-200',     hover: 'hover:bg-sky-50/60' },
  { bg: 'bg-cyan-500',     light: 'bg-cyan-50',     text: 'text-cyan-700',     border: 'border-cyan-200',    hover: 'hover:bg-cyan-50/60' },
  { bg: 'bg-indigo-500',   light: 'bg-indigo-50',   text: 'text-indigo-700',   border: 'border-indigo-200',  hover: 'hover:bg-indigo-50/60' },
  { bg: 'bg-slate-500',    light: 'bg-slate-50',    text: 'text-slate-700',    border: 'border-slate-200',   hover: 'hover:bg-slate-50/60' },
  { bg: 'bg-teal-500',     light: 'bg-teal-50',     text: 'text-teal-700',     border: 'border-teal-200',    hover: 'hover:bg-teal-50/60' },
];

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

  // ─── Clientes cadastrados ───
  const [clientes, setClientes] = useState([]);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [showSugestoes, setShowSugestoes] = useState(false);
  const [novoClienteTelefone, setNovoClienteTelefone] = useState('');
  const [salvandoCliente, setSalvandoCliente] = useState(false);
  const [modoNovoCliente, setModoNovoCliente] = useState(false);

  // ─── Data selecionada ───
  const [dataSelecionada, setDataSelecionada] = useState(new Date().toISOString().split('T')[0]);

  // ─── Modal ───
  const [modalAberto, setModalAberto] = useState(false);
  const [selecao, setSelecao] = useState({ hora: '', profId: null, profNome: '' });
  const [salvando, setSalvando] = useState(false);

  // ─── Formulário ───
  const [novo, setNovo] = useState({ cliente: '', procId: '', tamanho: 'P', valor: '', obs: '', pago: false });
  const [ignorarPrejuizo, setIgnorarPrejuizo] = useState(false);
  const [mostrarSugerido, setMostrarSugerido] = useState(false);

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
        const [cfgRes, profRes, procRes, cliRes] = await Promise.all([
          supabase.from('configuracoes').select('custo_fixo_por_atendimento, taxa_maquininha_pct').eq('salao_id', salaoId).single(),
          supabase.from('profissionais').select('id, nome, cargo').eq('salao_id', salaoId).eq('ativo', true).order('nome'),
          supabase.from('procedimentos').select('id, nome, categoria, requer_comprimento, preco_p, preco_m, preco_g, custo_variavel').eq('salao_id', salaoId).eq('ativo', true).order('nome'),
          supabase.from('clientes').select('id, nome, telefone').eq('salao_id', salaoId).order('nome'),
        ]);

        if (cfgRes.data) {
          setConfig({
            custoFixo: Number(cfgRes.data.custo_fixo_por_atendimento) || 0,
            taxaMaq: Number(cfgRes.data.taxa_maquininha_pct) || TAXA_MAQUININHA_PADRAO,
          });
        }
        // Ordena: proprietária primeiro, depois funcionários
        const sorted = (profRes.data || []).sort((a, b) => {
          if (a.cargo === 'PROPRIETARIO' && b.cargo !== 'PROPRIETARIO') return -1;
          if (b.cargo === 'PROPRIETARIO' && a.cargo !== 'PROPRIETARIO') return 1;
          return a.nome.localeCompare(b.nome);
        });
        setProfissionais(sorted);
        setProcedimentos(procRes.data || []);
        setClientes(cliRes.data || []);
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

  // ─── Autocomplete de clientes ───
  const clientesFiltrados = useMemo(() => {
    if (!buscaCliente.trim()) return [];
    return clientes
      .filter(c => c.nome.toLowerCase().includes(buscaCliente.toLowerCase()))
      .slice(0, 6);
  }, [buscaCliente, clientes]);

  const selecionarCliente = (nome) => {
    setNovo(prev => ({ ...prev, cliente: nome }));
    setBuscaCliente(nome);
    setShowSugestoes(false);
  };

  const criarClienteRapido = async () => {
    if (!buscaCliente.trim()) return;
    setSalvandoCliente(true);
    try {
      const { data, error } = await supabase.from('clientes').insert([{
        salao_id: salaoId,
        nome: buscaCliente.trim().toUpperCase(),
        telefone: novoClienteTelefone || null,
      }]).select().single();

      if (error) throw error;

      // Atualiza a lista local
      setClientes(prev => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)));
      setNovo(prev => ({ ...prev, cliente: data.nome }));
      setBuscaCliente(data.nome);
      setModoNovoCliente(false);
      setNovoClienteTelefone('');
      setShowSugestoes(false);
      showToast(`✅ ${data.nome} cadastrada!`, 'success');
    } catch (err) {
      showToast(`Erro: ${err.message}`, 'error');
    } finally {
      setSalvandoCliente(false);
    }
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
      custoProduto: Number(proc.custo_variavel) || 0,
      cargoProfissional: cargo,
    });
  }, [engine, novo.procId, novo.valor, novo.tamanho, selecao.profId, procedimentos, profissionais]);

  // ─── Abrir modal ───
  const abrirAgendamento = (hora, profId) => {
    const prof = profissionais.find(p => p.id === profId);
    setSelecao({ hora, profId, profNome: prof?.nome || '' });
    setNovo({ cliente: '', procId: '', tamanho: 'P', valor: '', obs: '', pago: false });
    setBuscaCliente('');
    setModoNovoCliente(false);
    setNovoClienteTelefone('');
    setIgnorarPrejuizo(false);
    setMostrarSugerido(false);
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
    
    let precoSugerido = 0;
    const precoP = Number(proc.preco_p) || 0;
    
    if (tamanho === 'P') precoSugerido = precoP;
    else if (tamanho === 'M') precoSugerido = Number(proc.preco_m) || (precoP * 1.20);
    else if (tamanho === 'G') precoSugerido = Number(proc.preco_g) || (precoP * 1.30);

    setNovo(prev => ({ ...prev, tamanho, valor: precoSugerido || prev.valor }));
  };

  // ─── Validar valor monetário ───
  const validarValorMonetario = (val) => {
    const num = Number(val);
    return !isNaN(num) && num > 0 && num <= 999999 && Number.isFinite(num);
  };

  // ─── Salvar atendimento ───
  const salvar = async () => {
    const nomeCliente = novo.cliente.trim() || buscaCliente.trim();
    if (!nomeCliente) return showToast('Digite o nome da cliente!', 'error');
    if (!novo.procId) return showToast('Selecione o procedimento!', 'error');
    
    // 🛡️ Validar valor monetário
    if (!novo.valor || !validarValorMonetario(novo.valor)) {
      showToast('Valor deve estar entre R$ 0,01 e R$ 9.999,99', 'error');
      return;
    }

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
        cliente: nomeCliente.toUpperCase(),
        valor_cobrado: Number(novo.valor) || 0,
        valor_pago: novo.pago ? (Number(novo.valor) || 0) : 0,
        status: 'AGENDADO',
        obs: novo.obs || null,
      };

      const { error } = await supabase.from('atendimentos').insert(dados);
      if (error) throw error;

      // Toast informativo com detalhes do atendimento (viciante!)
      const lucroEstimado = previewFinanceiro?.lucroLiquido || 0;
      showToast(
        `✅ ${nomeCliente} às ${selecao.hora} | ${proc.nome} | Lucro: ${fmt(lucroEstimado)}`,
        'success'
      );
      setModalAberto(false);
      carregarAtendimentos();
    } catch (err) {
      showToast(`Erro: ${err.message}`, 'error');
    } finally {
      setSalvando(false);
    }
  };

  // ─── Modal Detalhes/Cancelamento ───
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState(null);
  const [cancelando, setCancelando] = useState(false);
  const [alterandoPagamento, setAlterandoPagamento] = useState(false);

  const abrirDetalhes = (agend) => {
    setAgendamentoSelecionado(agend);
    setModalDetalhesAberto(true);
  };

  const togglePagamento = async () => {
    if (!agendamentoSelecionado) return;
    setAlterandoPagamento(true);
    
    const novoValorPago = Number(agendamentoSelecionado.valor_pago) > 0 ? 0 : Number(agendamentoSelecionado.valor_cobrado);
    
    try {
      const { error } = await supabase
        .from('atendimentos')
        .update({ valor_pago: novoValorPago })
        .eq('id', agendamentoSelecionado.id);

      if (error) throw error;

      // Atualiza o estado local para refletir na UI imediatamente
      setAgendamentoSelecionado(prev => ({ ...prev, valor_pago: novoValorPago }));
      showToast(novoValorPago > 0 ? 'Atendimento marcado como PAGO!' : 'Atendimento marcado como NÃO PAGO.', 'success');
      carregarAtendimentos(); // Recarrega a grade
    } catch (err) {
      showToast(`Erro ao alterar pagamento: ${err.message}`, 'error');
    } finally {
      setAlterandoPagamento(false);
    }
  };

  const cancelarAgendamento = async () => {
    if (!agendamentoSelecionado) return;
    if (!window.confirm('Tem certeza que deseja cancelar este atendimento?')) return;

    setCancelando(true);
    try {
      const { error } = await supabase
        .from('atendimentos')
        .update({ status: 'CANCELADO' })
        .eq('id', agendamentoSelecionado.id);

      if (error) throw error;

      showToast('Atendimento cancelado com sucesso!', 'success');
      setModalDetalhesAberto(false);
      carregarAtendimentos();
    } catch (err) {
      showToast(`Erro: ${err.message}`, 'error');
    } finally {
      setCancelando(false);
    }
  };

  // ─── Encontrar agendamento na grade ───
  const getAgendamento = (hora, profId) => {
    return agendamentos.find(a => a.horario?.substring(0, 5) === hora && a.profissional_id === profId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400 font-medium text-sm">Carregando agenda...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-gradient-to-br from-slate-50 via-blue-50/10 to-blue-100/30 min-h-screen font-sans">
      {/* ═══ HEADER COM NAVEGAÇÃO DE DATA ═══ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Sparkles size={16} className="text-blue-500" />
            <h1 className="text-2xl font-black bg-gradient-to-r from-blue-950 to-slate-600 bg-clip-text text-transparent">Agenda</h1>
          </div>
          <p className="text-slate-400 text-sm">Clique no horário para lançar o faturamento.</p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => mudarDia(-1)} className="p-2 hover:bg-white rounded-lg transition-all shadow-sm border border-slate-200 bg-white">
            <ChevronLeft size={16} className="text-slate-500" />
          </button>
          <button onClick={hoje}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${ehHoje ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-blue-200/50' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            {ehHoje ? '📅 Hoje' : fmtDataCompleta(dataSelecionada)}
          </button>
          <input type="date" value={dataSelecionada} onChange={e => setDataSelecionada(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400/50 bg-white shadow-sm" />
          <button onClick={() => mudarDia(1)} className="p-2 hover:bg-white rounded-lg transition-all shadow-sm border border-slate-200 bg-white">
            <ChevronRight size={16} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* ═══ GRADE DE AGENDA ═══ */}
      {/* Aviso se a proprietária não está na planilha */}
      {role === 'PROPRIETARIO' && profissionais.length > 0 && !profissionais.some(p => p.cargo === 'PROPRIETARIO') && (
        <div className="mb-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-lg">👑</span>
            </div>
            <div>
              <p className="text-sm font-bold text-amber-800">Você também atende? Adicione-se à agenda!</p>
              <p className="text-xs text-amber-600">Como proprietária, você precisa de uma coluna própria para seus agendamentos.</p>
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                // Busca nome da proprietária do salão
                const { data: salaoData } = await supabase.from('saloes').select('nome_proprietaria, nome').eq('id', salaoId).single();
                const nome = salaoData?.nome_proprietaria || 'PROPRIETÁRIA';
                const { error } = await supabase.from('profissionais').insert({
                  salao_id: salaoId,
                  nome,
                  cargo: 'PROPRIETARIO',
                  salario_fixo: 0,
                  ativo: true,
                });
                if (error) throw error;
                showToast(`${nome} adicionada à agenda! 👑`, 'success');
                // Recarrega profissionais
                const { data: profData } = await supabase.from('profissionais').select('id, nome, cargo').eq('salao_id', salaoId).eq('ativo', true).order('nome');
                setProfissionais(profData || []);
              } catch (err) {
                showToast('Erro: ' + err.message, 'error');
              }
            }}
            className="flex-shrink-0 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-200"
          >
            Adicionar-me 👑
          </button>
        </div>
      )}

      {profissionais.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <User size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-bold">Nenhum profissional cadastrado</p>
          <p className="text-xs text-slate-400 mt-1">Adicione profissionais nas Configurações</p>
          {role === 'PROPRIETARIO' && (
            <button
              onClick={async () => {
                try {
                  const { data: salaoData } = await supabase.from('saloes').select('nome_proprietaria, nome').eq('id', salaoId).single();
                  const nome = salaoData?.nome_proprietaria || 'PROPRIETÁRIA';
                  const { error } = await supabase.from('profissionais').insert({
                    salao_id: salaoId,
                    nome,
                    cargo: 'PROPRIETARIO',
                    salario_fixo: 0,
                    ativo: true,
                  });
                  if (error) throw error;
                  showToast(`${nome} adicionada à agenda! 👑`, 'success');
                  const { data: profData } = await supabase.from('profissionais').select('id, nome, cargo').eq('salao_id', salaoId).eq('ativo', true).order('nome');
                  setProfissionais(profData || []);
                } catch (err) {
                  showToast('Erro: ' + err.message, 'error');
                }
              }}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-sky-500 text-white rounded-xl font-bold text-sm hover:from-blue-700 hover:to-sky-600 transition-all shadow-lg shadow-blue-200"
            >
              👑 Começar — Adicionar-me como profissional
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/5 overflow-x-auto ring-1 ring-slate-200">
          <table className="w-full border-collapse min-w-[600px]">
            <thead>
              <tr>
                <th className="p-3 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-16 text-center">Hora</th>
                {profissionais.map((p, idx) => {
                  const cor = PROF_COLORS[idx % PROF_COLORS.length];
                  return (
                    <th key={p.id} className={`p-0 border-b border-slate-100`}>
                      <div className={`${cor.bg} px-4 py-3 text-white text-center`}>
                        <span className="text-xs font-bold uppercase tracking-wide">{p.nome}</span>
                        <span className="block text-[9px] font-normal text-white/70 mt-0.5">
                          {p.cargo === 'PROPRIETARIO' ? '👑 Proprietária' : '👤 Funcionário(a)'}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {HORARIOS.map(hora => (
                <tr key={hora} className="group">
                  <td className="p-1.5 border-b border-slate-50 bg-slate-50/50 text-center font-bold text-slate-400 text-[10px]">{hora}</td>
                  {profissionais.map((prof, idx) => {
                    const agend = getAgendamento(hora, prof.id);
                    const cor = PROF_COLORS[idx % PROF_COLORS.length];
                    return (
                      <td
                        key={prof.id}
                        onClick={() => !agend ? abrirAgendamento(hora, prof.id) : abrirDetalhes(agend)}
                        className={`p-1 border-b border-slate-50 h-14 cursor-pointer transition-all ${!agend ? cor.hover : ''}`}
                      >
                        {agend ? (
                          <div className={`h-full w-full rounded-lg p-1.5 text-[10px] relative overflow-hidden shadow-sm ${
                            agend.status === 'EXECUTADO'
                              ? 'bg-emerald-500 text-white'
                              : `${cor.light} ${cor.text} border ${cor.border}`
                          }`}>
                            <div className="font-bold truncate">{agend.cliente}</div>
                            <div className="truncate text-[9px] opacity-70">
                              {agend.procedimentos?.nome} {agend.comprimento ? `(${agend.comprimento})` : ''}
                            </div>
                            {role === 'PROPRIETARIO' && (
                              <div className={`absolute bottom-0.5 right-1 px-1.5 py-0.5 rounded-full text-[8px] font-black ${
                                agend.status === 'EXECUTADO'
                                  ? 'bg-white/20 text-white'
                                  : Number(agend.lucro_liquido) >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                              }`}>
                                {fmt(agend.lucro_liquido)}
                              </div>
                            )}
                            {agend.status === 'EXECUTADO' && (
                              <CheckCircle2 size={10} className="absolute top-1 right-1 text-white/70" />
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

      {/* ═══ MODAL DETALHES DO ATENDIMENTO ═══ */}
      {modalDetalhesAberto && agendamentoSelecionado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50" onClick={() => setModalDetalhesAberto(false)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-900">Detalhes</h2>
              <button onClick={() => setModalDetalhesAberto(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            <div className="space-y-4 mb-8">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Cliente</p>
                <p className="text-lg font-bold text-slate-800">{agendamentoSelecionado.cliente}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Procedimento</p>
                <p className="font-medium text-slate-700">{agendamentoSelecionado.procedimentos?.nome} {agendamentoSelecionado.comprimento ? `(${agendamentoSelecionado.comprimento})` : ''}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Horário</p>
                  <p className="font-medium text-slate-700">{agendamentoSelecionado.horario?.substring(0, 5)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Profissional</p>
                  <p className="font-medium text-slate-700">{agendamentoSelecionado.profissionais?.nome}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Valor</p>
                <p className="font-medium text-slate-700">{fmt(agendamentoSelecionado.valor_cobrado)}</p>
              </div>

              {/* PAGO OU NÃO */}
              <div className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-colors ${Number(agendamentoSelecionado.valor_pago) > 0 ? 'border-emerald-200 bg-emerald-50 hover:border-emerald-300' : 'border-slate-200 bg-white hover:border-slate-300'}`} onClick={togglePagamento}>
                <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${Number(agendamentoSelecionado.valor_pago) > 0 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-transparent'}`}>
                  {alterandoPagamento ? <Loader2 size={12} className="animate-spin text-emerald-500" /> : <CheckCircle2 size={14} />}
                </div>
                <div className="flex flex-col flex-1">
                  <span className={`text-sm font-bold leading-none ${Number(agendamentoSelecionado.valor_pago) > 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                    {Number(agendamentoSelecionado.valor_pago) > 0 ? 'Atendimento Pago' : 'Pagamento Pendente'}
                  </span>
                  <span className="text-[10px] mt-1 opacity-70">
                    Clique para alterar o status de pagamento.
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={cancelarAgendamento}
              disabled={cancelando}
              className="w-full py-3 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
            >
              {cancelando ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
              Cancelar Atendimento
            </button>
          </div>
        </div>
      )}

      {/* ═══ PAINEL LATERAL (MODAL) ═══ */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-end z-50" onClick={() => setModalAberto(false)}>
          <div className="w-full max-w-md bg-white/95 backdrop-blur-xl h-full shadow-2xl border-l border-slate-100 p-6 overflow-y-auto animate-slideInRight"
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

              {/* ═══ CLIENTE COM AUTOCOMPLETE + CADASTRO RÁPIDO ═══ */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Cliente</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="text"
                    placeholder="Buscar ou digitar nome..."
                    className="w-full border-2 border-slate-200 rounded-xl p-3 pl-9 outline-none focus:border-blue-400 font-bold text-sm uppercase transition-colors"
                    value={buscaCliente}
                    onChange={e => {
                      const val = e.target.value.toUpperCase();
                      setBuscaCliente(val);
                      setNovo(prev => ({ ...prev, cliente: val }));
                      setShowSugestoes(true);
                      setModoNovoCliente(false);
                    }}
                    onFocus={() => buscaCliente.trim() && setShowSugestoes(true)}
                  />

                  {/* Sugestões de clientes existentes */}
                  {showSugestoes && buscaCliente.trim() && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                      {clientesFiltrados.length > 0 ? (
                        <>
                          {clientesFiltrados.map(c => (
                            <button
                              key={c.id}
                              onClick={() => selecionarCliente(c.nome)}
                              className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center justify-between transition-colors border-b border-slate-50 last:border-0"
                            >
                              <div>
                                <span className="font-bold text-sm text-slate-800">{c.nome}</span>
                                {c.telefone && <span className="text-[10px] text-slate-400 ml-2">{c.telefone}</span>}
                              </div>
                              <User size={12} className="text-slate-300" />
                            </button>
                          ))}
                          <button
                            onClick={() => { setModoNovoCliente(true); setShowSugestoes(false); }}
                            className="w-full text-left px-4 py-3 hover:bg-sky-50 flex items-center gap-2 text-sky-600 font-bold text-sm border-t border-slate-100"
                          >
                            <UserPlus size={14} />
                            Cadastrar "{buscaCliente.trim()}" como nova cliente
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => { setModoNovoCliente(true); setShowSugestoes(false); }}
                          className="w-full text-left px-4 py-3 hover:bg-sky-50 flex items-center gap-2 text-sky-600 font-bold text-sm"
                        >
                          <UserPlus size={14} />
                          Cadastrar "{buscaCliente.trim()}" como nova cliente
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Mini-formulário de nova cliente */}
                {modoNovoCliente && (
                  <div className="mt-2 bg-sky-50 border border-sky-200 rounded-xl p-3 animate-fadeIn">
                    <p className="text-[10px] font-black uppercase text-sky-600 mb-2 flex items-center gap-1">
                      <UserPlus size={12} /> Nova cliente: {buscaCliente.trim()}
                    </p>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Phone size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sky-400" />
                        <input
                          type="text"
                          placeholder="WhatsApp (opcional)"
                          className="w-full bg-white border border-sky-200 rounded-lg px-3 py-2 pl-8 text-xs outline-none focus:border-sky-400"
                          value={novoClienteTelefone}
                          onChange={e => setNovoClienteTelefone(e.target.value)}
                        />
                      </div>
                      <button
                        onClick={criarClienteRapido}
                        disabled={salvandoCliente}
                        className="bg-sky-500 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-sky-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        {salvandoCliente ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                        Salvar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* PROCEDIMENTO */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Procedimento</label>
                <select
                  className="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-blue-400 font-bold text-sm bg-white transition-colors"
                  value={novo.procId}
                  onChange={e => selecionarProcedimento(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {procedimentos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>

              {/* INFO CARD PRODUTO APLICADO */}
              {(() => {
                const proc = procedimentos.find(p => p.id === novo.procId);
                if (!proc || proc.categoria !== 'PRODUTO_APLICADO') return null;
                return (
                  <div className="mt-2 bg-violet-50 border border-violet-200 rounded-xl p-3">
                    <p className="text-[10px] font-black uppercase text-violet-600 mb-1 flex items-center gap-1">
                      <Package size={12} /> Detalhes do Produto
                    </p>
                    <div className="flex items-center justify-between text-xs text-violet-800">
                      <span>Rende: <b>{proc.aplicacoes_por_frasco} aplicações</b></span>
                      <span>Custo/Dose: <b>{fmt(proc.custo_variavel)}</b></span>
                    </div>
                  </div>
                );
              })()}

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
                              ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200/50'
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
                role === 'PROPRIETARIO' && previewFinanceiro?.prejuizo && !ignorarPrejuizo
                  ? 'bg-red-50 border-red-400'
                  : 'bg-slate-50 border-transparent'
              }`}>
                <div className="flex justify-between items-start mb-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Valor Cobrado (R$)</label>
                  {(() => {
                    const proc = procedimentos.find(p => p.id === novo.procId);
                    if (!proc) return null;
                    const precoP = Number(proc.preco_p) || 0;
                    let sugerido = 0;
                    if (novo.tamanho === 'P') sugerido = precoP;
                    else if (novo.tamanho === 'M') sugerido = Number(proc.preco_m) || (precoP * 1.20);
                    else if (novo.tamanho === 'G') sugerido = Number(proc.preco_g) || (precoP * 1.30);
                    
                    if (!sugerido) return null;
                    return (
                      <div className="flex items-center gap-1">
                        <button onClick={() => setNovo(prev => ({ ...prev, valor: sugerido }))}
                          className="text-[9px] font-black bg-blue-100 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-200 transition-colors">
                          Tabela: {mostrarSugerido ? fmt(sugerido) : '***'}
                        </button>
                        <button onClick={() => setMostrarSugerido(!mostrarSugerido)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors" title={mostrarSugerido ? "Ocultar" : "Mostrar"}>
                          {mostrarSugerido ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      </div>
                    );
                  })()}
                </div>
                <input
                  type="number" step="0.01"
                  className={`w-full bg-transparent text-3xl font-black outline-none ${
                    role === 'PROPRIETARIO' && previewFinanceiro?.prejuizo ? 'text-red-600' : 'text-slate-900'
                  }`}
                  value={novo.valor}
                  onChange={e => setNovo({...novo, valor: e.target.value})}
                  placeholder="0,00"
                />
                <p className="text-[9px] text-slate-400 mt-1">Valor entre R$ 0,01 e R$ 9.999,99 — sistema calcula lucro automaticamente.</p>

                {/* Desmembramento do Motor Financeiro */}
                {role === 'PROPRIETARIO' && previewFinanceiro && (
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
                  className="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-blue-400 text-sm transition-colors"
                  value={novo.obs} onChange={e => setNovo({...novo, obs: e.target.value.toUpperCase()})} />
              </div>

              {/* PAGO OU NÃO */}
              <div className="flex items-center gap-2 p-3 border-2 border-slate-200 rounded-xl bg-white cursor-pointer transition-colors hover:border-blue-200" onClick={() => setNovo({...novo, pago: !novo.pago})}>
                <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${novo.pago ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-transparent'}`}>
                  <CheckCircle2 size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-700 leading-none">Atendimento já foi pago?</span>
                  <span className="text-[10px] text-slate-400 mt-1">Marque se a cliente já realizou o pagamento.</span>
                </div>
              </div>

              {/* BOTÃO SALVAR */}
              <button
                onClick={salvar}
                disabled={salvando}
                className={`w-full py-4 rounded-2xl font-black text-lg transition-all shadow-xl flex items-center justify-center gap-2 ${
                  salvando ? 'bg-slate-300 text-slate-500 cursor-not-allowed' :
                  role === 'PROPRIETARIO' && previewFinanceiro?.prejuizo
                    ? 'bg-red-600 text-white shadow-red-200 hover:bg-red-700'
                    : 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-blue-200/50 hover:from-blue-700 hover:to-sky-600'
                }`}
              >
                {salvando ? (
                  <><Loader2 size={20} className="animate-spin" /> Salvando...</>
                ) : role === 'PROPRIETARIO' && previewFinanceiro?.prejuizo ? (
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
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-blue-200">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);