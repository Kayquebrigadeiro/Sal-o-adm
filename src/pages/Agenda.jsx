import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import { FinancialEngine } from '../services/FinancialEngine';
import { User, X, CheckCircle2, AlertTriangle, UserPlus, ChevronLeft, ChevronRight, Loader2, Sparkles, Search, Phone, Plus, Eye, EyeOff, Trash2, Package, Pencil, HelpCircle, Settings } from 'lucide-react';
import Tooltip from '../components/Tooltip';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtPct = (v) => `${Number(v || 0).toFixed(1)}%`;

// Estilo de planilha — fundo neutro para cabeçalhos e cores pastel para os agendamentos
const PROF_COLORS = [
  { bg: 'bg-slate-100 border-r border-slate-300', light: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300', hover: 'hover:bg-slate-50' },
  { bg: 'bg-slate-100 border-r border-slate-300', light: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300', hover: 'hover:bg-slate-50' },
  { bg: 'bg-slate-100 border-r border-slate-300', light: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-300', hover: 'hover:bg-slate-50' },
  { bg: 'bg-slate-100 border-r border-slate-300', light: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300', hover: 'hover:bg-slate-50' },
  { bg: 'bg-slate-100 border-r border-slate-300', light: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300', hover: 'hover:bg-slate-50' },
  { bg: 'bg-slate-100 border-r border-slate-300', light: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-300', hover: 'hover:bg-slate-50' },
];

export default function Agenda({ salaoId, role }) {
  const { showToast } = useToast();

  // ─── Dados do Supabase ───
  const [profissionais, setProfissionais] = useState([]);
  const [procedimentos, setProcedimentos] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [config, setConfig] = useState({ custoFixo: 0, horariosSemana: null, horariosExcecao: {} });
  const [loading, setLoading] = useState(true);
  const [custosCompostos, setCustosCompostos] = useState({});

  // ─── Drag and Drop ───
  const [dragging, setDragging] = useState(null); // { agendId, profId, hora }
  const [dragOver, setDragOver] = useState(null);  // { profId, hora }

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
  const [highlightId, setHighlightId] = useState(null);

  // ─── Formulário ───
  const [novo, setNovo] = useState({ cliente: '', procId: '', tamanho: 'P', valor: '', obs: '', pago: false });
  const [ignorarPrejuizo, setIgnorarPrejuizo] = useState(false);
  const [mostrarSugerido, setMostrarSugerido] = useState(true);

  // ─── Sprint 3: Múltiplos Serviços ───
  const [servicos, setServicos] = useState([]);
  const [edicaoServico, setEdicaoServico] = useState(null);

  // ─── Modal Novo Profissional (Atalho) ───
  const [modalProfAberto, setModalProfAberto] = useState(false);
  const [novoProf, setNovoProf] = useState({ nome: '', cargo: 'FUNCIONARIO' });
  const [salvandoProf, setSalvandoProf] = useState(false);

  // ─── Modal de Exceção de Horário ───
  const [modalHorarioDiaAberto, setModalHorarioDiaAberto] = useState(false);
  const [horarioDiaConfig, setHorarioDiaConfig] = useState({ ativo: true, abertura: '08:00', fechamento: '19:00' });
  const [salvandoHorarioDia, setSalvandoHorarioDia] = useState(false);

  const abrirAjusteDia = () => {
    let conf = { ativo: true, abertura: '08:00', fechamento: '19:00' };
    
    if (config.horariosExcecao && config.horariosExcecao[dataSelecionada]) {
      conf = config.horariosExcecao[dataSelecionada];
    } else if (config.horariosSemana) {
      const [year, month, day] = dataSelecionada.split('-');
      const dataObj = new Date(year, month - 1, day);
      const diaDaSemana = dataObj.getDay().toString();
      if (config.horariosSemana[diaDaSemana]) {
         conf = { ...config.horariosSemana[diaDaSemana] };
      }
    }
    
    setHorarioDiaConfig(conf);
    setModalHorarioDiaAberto(true);
  };

  const salvarAjusteDia = async () => {
    setSalvandoHorarioDia(true);
    try {
      const novaExcecao = {
        ...config.horariosExcecao,
        [dataSelecionada]: horarioDiaConfig
      };

      const { error } = await supabase
        .from('configuracoes')
        .update({ horarios_excecao: novaExcecao })
        .eq('salao_id', salaoId);

      if (error) throw error;
      
      setConfig(prev => ({ ...prev, horariosExcecao: novaExcecao }));
      showToast('HORÁRIO DO DIA ATUALIZADO!', 'success');
      setModalHorarioDiaAberto(false);
    } catch (err) {
      showToast('ERRO AO SALVAR HORÁRIO', 'error');
    } finally {
      setSalvandoHorarioDia(false);
    }
  };

  const limparAjusteDia = async () => {
    setSalvandoHorarioDia(true);
    try {
      const novaExcecao = { ...config.horariosExcecao };
      delete novaExcecao[dataSelecionada];

      const { error } = await supabase
        .from('configuracoes')
        .update({ horarios_excecao: novaExcecao })
        .eq('salao_id', salaoId);

      if (error) throw error;
      
      setConfig(prev => ({ ...prev, horariosExcecao: novaExcecao }));
      showToast('AJUSTE REMOVIDO!', 'success');
      setModalHorarioDiaAberto(false);
    } catch (err) {
      showToast('ERRO AO REMOVER AJUSTE', 'error');
    } finally {
      setSalvandoHorarioDia(false);
    }
  };

  // ─── Engine ───
  const engine = useMemo(() => new FinancialEngine({
    custoFixoPorAtendimento: config.custoFixo
  }), [config]);

  // ─── Carregar dados iniciais ───
  useEffect(() => {
    if (!salaoId) {
      setLoading(false);
      return;
    }
    const carregar = async () => {
      setLoading(true);
      try {
        const [cfgRes, profRes, procRes, cliRes, custoRes] = await Promise.all([
          supabase.from('configuracoes').select('custo_fixo_por_atendimento, horarios_semana, horarios_excecao').eq('salao_id', salaoId).maybeSingle(),
          supabase.from('profissionais').select('id, nome, cargo').eq('salao_id', salaoId).eq('ativo', true).order('nome'),
          supabase.from('procedimentos').select('id, nome, categoria, requer_comprimento, preco_p, preco_m, preco_g, custo_variavel').eq('salao_id', salaoId).eq('ativo', true).order('nome'),
          supabase.from('clientes').select('id, nome, telefone').eq('salao_id', salaoId).order('nome'),
          supabase.from('custo_composto_procedimento').select('procedimento_id, custo_total_composicao').eq('salao_id', salaoId),
        ]);

        if (cfgRes.data) {
          setConfig({
            custoFixo: Number(cfgRes.data.custo_fixo_por_atendimento) || 0,
            horariosSemana: cfgRes.data.horarios_semana || null,
            horariosExcecao: cfgRes.data.horarios_excecao || {}
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

        // Criar mapa de custos compostos
        const custoMap = {};
        (custoRes.data || []).forEach(c => {
          custoMap[c.procedimento_id] = Number(c.custo_total_composicao) || 0;
        });
        setCustosCompostos(custoMap);
      } catch (err) {
        showToast('ERRO AO CARREGAR AGENDA', 'error');
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
    // 🛡️ Sprint 3: Usar v_atendimentos_completo para obter múltiplos procedimentos
    const colunas = role === 'PROPRIETARIO'
      ? 'id, data, horario, cliente, valor_cobrado, valor_pago, valor_pendente, status, obs, profissional_id, lucro_liquido, lucro_possivel, custo_fixo, custo_variavel, valor_maquininha, valor_profissional, profissionais, procedimentos'
      : 'id, data, horario, cliente, valor_cobrado, valor_pago, valor_pendente, status, obs, profissional_id, profissionais, procedimentos';

    const { data, error } = await supabase
      .from('v_atendimentos_completo')
      .select(colunas)
      .eq('salao_id', salaoId)
      .eq('data', dataSelecionada)
      .order('horario');

    if (error) {
      console.error('[Agenda] Erro ao carregar:', error);
      showToast('ERRO AO CARREGAR AGENDA', 'error');
      return;
    }

    setAgendamentos(data || []);
  };

  // ─── Geração Dinâmica de Horários ───
  const HORARIOS = useMemo(() => {
    let abertura = '08:00';
    let fechamento = '19:00';
    let ativo = true;

    if (config.horariosExcecao && config.horariosExcecao[dataSelecionada]) {
      const exc = config.horariosExcecao[dataSelecionada];
      abertura = exc.abertura || abertura;
      fechamento = exc.fechamento || fechamento;
      ativo = exc.ativo !== undefined ? exc.ativo : ativo;
    } else if (config.horariosSemana) {
      const [year, month, day] = dataSelecionada.split('-');
      const dataObj = new Date(year, month - 1, day);
      const diaDaSemana = dataObj.getDay().toString();
      const hs = config.horariosSemana[diaDaSemana];
      if (hs) {
        abertura = hs.abertura || abertura;
        fechamento = hs.fechamento || fechamento;
        ativo = hs.ativo !== undefined ? hs.ativo : ativo;
      }
    }

    if (!ativo) return [];

    const horariosGerados = [];
    let [horaAtual, minAtual] = abertura.split(':').map(Number);
    const [horaFim, minFim] = fechamento.split(':').map(Number);

    const minutosTotaisAtual = () => horaAtual * 60 + minAtual;
    const minutosTotaisFim = horaFim * 60 + minFim;

    while (minutosTotaisAtual() <= minutosTotaisFim) {
      horariosGerados.push(`${String(horaAtual).padStart(2, '0')}:${String(minAtual).padStart(2, '0')}`);
      minAtual += 30;
      if (minAtual >= 60) {
        horaAtual += 1;
        minAtual -= 60;
      }
    }

    return horariosGerados;
  }, [dataSelecionada, config.horariosSemana, config.horariosExcecao]);

  // ─── Autocomplete de clientes ───
  const clientesFiltrados = useMemo(() => {
    if (!buscaCliente.trim()) return [];
    return clientes
      .filter(c => c.nome.toLowerCase().includes(buscaCliente.toLowerCase()))
      .slice(0, 6);
  }, [buscaCliente, clientes]);

  // ─── Dias para o Painel de Mover ───
  const nextDays = useMemo(() => {
    if (!dragging?.dataOrigem) return [];
    const arr = [];
    const [y, m, d] = dragging.dataOrigem.split('-');
    const baseDate = new Date(y, m - 1, d);
    for(let i = 0; i <= 6; i++) {
       const date = new Date(baseDate);
       date.setDate(date.getDate() + i);
       arr.push(date.toISOString().split('T')[0]);
    }
    return arr;
  }, [dragging]);

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
      showToast(`✅ ${data.nome} CADASTRADA!`, 'success');
    } catch (err) {
      showToast(`ERRO: ${err.message}`, 'error');
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
    return dt.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
  };

  // ─── Preview financeiro em tempo real ───
  const previewFinanceiro = useMemo(() => {
    const proc = procedimentos.find(p => p.id === novo.procId);
    if (!proc || !novo.valor) return null;

    const profSelecionado = profissionais.find(p => p.id === selecao.profId);
    const cargo = profSelecionado?.cargo || 'FUNCIONARIO';

    return engine.calcularAtendimento({
      valorCobrado: Number(novo.valor),
      custoProduto: custosCompostos[proc.id] ?? Number(proc.custo_variavel) ?? 0,
      cargoProfissional: cargo,
    });
  }, [engine, novo.procId, novo.valor, novo.tamanho, selecao.profId, procedimentos, profissionais, custosCompostos]);

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
    setServicos([]);
    setEdicaoServico(null);
    setModalAberto(true);
  };

  // ─── Selecionar procedimento ───
  const selecionarProcedimento = (procId) => {
    const proc = procedimentos.find(p => p.id === procId);
    if (!proc) return;
    const preco = Number(proc.preco_p) || 0;
    setNovo(prev => ({ ...prev, procId, valor: preco }));
    setMostrarSugerido(true);
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

  const isMissingRpc = (error) => {
    const message = String(error?.message || '').toLowerCase();
    return error?.code === 'PGRST202' || message.includes('could not find the function') || message.includes('not found');
  };

  // ─── Criar Profissional Rápido ───
  const criarProfissionalRapido = async () => {
    if (!novoProf.nome.trim()) return showToast('DIGITE O NOME DO PROFISSIONAL', 'error');
    setSalvandoProf(true);
    try {
      const { error } = await supabase.from('profissionais').insert([{
        salao_id: salaoId,
        nome: novoProf.nome.trim().toUpperCase(),
        cargo: novoProf.cargo,
        salario_fixo: 0,
        ativo: true
      }]);
      if (error) throw error;
      showToast('PROFISSIONAL ADICIONADO À EQUIPE!', 'success');
      setModalProfAberto(false);
      setNovoProf({ nome: '', cargo: 'FUNCIONARIO' });
      // Recarrega profissionais na grade
      const { data: profData } = await supabase.from('profissionais').select('id, nome, cargo').eq('salao_id', salaoId).eq('ativo', true).order('nome');
      setProfissionais(profData || []);
    } catch (err) {
      showToast('ERRO: ' + err.message, 'error');
    } finally {
      setSalvandoProf(false);
    }
  };

  // ─── Sprint 3: Adicionar Serviço à Lista ───
  const adicionarServico = () => {
    const nomeCliente = novo.cliente.trim() || buscaCliente.trim();
    if (!nomeCliente) return showToast('DIGITE O NOME DA CLIENTE!', 'error');
    if (!novo.procId) return showToast('SELECIONE O PROCEDIMENTO!', 'error');
    if (!novo.valor || !validarValorMonetario(novo.valor)) {
      return showToast('VALOR DEVE ESTAR ENTRE R$ 0,01 E R$ 9.999,99', 'error');
    }

    // 🛡️ CORREÇÃO CRÍTICA: Validar se procedimento já foi adicionado
    if (edicaoServico === null) {
      const jaExiste = servicos.some(s => s.procId === novo.procId);
      if (jaExiste) {
        return showToast('⚠️ ESTE PROCEDIMENTO JÁ FOI ADICIONADO À LISTA!', 'error');
      }
    }

    const proc = procedimentos.find(p => p.id === novo.procId);
    
    // Calcular preço sugerido (indicado pelo sistema)
    let precoSugerido = 0;
    if (proc) {
      const precoP = Number(proc.preco_p) || 0;
      if (novo.tamanho === 'P') precoSugerido = precoP;
      else if (novo.tamanho === 'M') precoSugerido = Number(proc.preco_m) || (precoP * 1.20);
      else if (novo.tamanho === 'G') precoSugerido = Number(proc.preco_g) || (precoP * 1.30);
    }
    
    const novoServico = {
      id: edicaoServico !== null ? servicos[edicaoServico].id : Date.now().toString(),
      procId: novo.procId,
      procNome: proc?.nome,
      tamanho: novo.tamanho,
      valor_indicado: precoSugerido,
      valor_cobrado: Number(novo.valor),
      categoria: proc?.categoria,
      requer_comprimento: proc?.requer_comprimento,
    };

    if (edicaoServico !== null) {
      // Atualizando serviço existente
      const novoServicos = [...servicos];
      novoServicos[edicaoServico] = novoServico;
      setServicos(novoServicos);
      setEdicaoServico(null);
      showToast('✏️ SERVIÇO ATUALIZADO NA LISTA', 'success');
    } else {
      // Adicionando novo serviço
      setServicos([...servicos, novoServico]);
      showToast('➕ SERVIÇO ADICIONADO À LISTA', 'success');
    }

    // Limpar formulário para próximo serviço
    setNovo({ cliente: novo.cliente, procId: '', tamanho: 'P', valor: '', obs: novo.obs, pago: false });
  };

  // ─── Sprint 3: Editar Serviço da Lista ───
  const editarServico = (indice) => {
    const servico = servicos[indice];
    setNovo({
      cliente: buscaCliente || novo.cliente,
      procId: servico.procId,
      tamanho: servico.tamanho,
      valor: String(servico.valor_cobrado),
      obs: novo.obs,
      pago: novo.pago,
    });
    setEdicaoServico(indice);
    showToast('📝 EDITANDO SERVIÇO DA LISTA', 'info');
  };

  // ─── Sprint 3: Remover Serviço da Lista ───
  const removerServico = (indice) => {
    setServicos(servicos.filter((_, i) => i !== indice));
    if (edicaoServico === indice) {
      setEdicaoServico(null);
      setNovo({ cliente: novo.cliente, procId: '', tamanho: 'P', valor: '', obs: novo.obs, pago: false });
    }
    showToast('🗑️ SERVIÇO REMOVIDO DA LISTA', 'success');
  };

  // ─── Salvar atendimento ───
  const salvar = async () => {
    const nomeCliente = novo.cliente.trim() || buscaCliente.trim();
    if (!nomeCliente) return showToast('DIGITE O NOME DA CLIENTE!', 'error');
      
    // Sprint 3: Validar se há serviços na lista
    if (servicos.length === 0) return showToast('ADICIONE PELO MENOS UM SERVIÇO!', 'error');

    setSalvando(true);
    
    try {
      const dadosServicos = servicos.map((s, idx) => ({
        procedimento_id: s.procId,
        comprimento: s.requer_comprimento ? s.tamanho : null,
        valor_indicado: s.valor_indicado,
        valor_cobrado: s.valor_cobrado,
        valor_pago: novo.pago ? s.valor_cobrado : 0,
        sequencia: idx + 1,
      }));

      const { data: rpcData, error: rpcError } = await supabase.rpc('criar_atendimento_com_procedimentos', {
        p_salao_id: salaoId,
        p_data: dataSelecionada,
        p_horario: selecao.hora,
        p_profissional_id: selecao.profId,
        p_cliente: nomeCliente.toUpperCase(),
        p_obs: novo.obs || null,
        p_status: 'AGENDADO',
        p_procedimentos: dadosServicos,
      });

      if (rpcError && !isMissingRpc(rpcError)) throw rpcError;

      if (rpcError && isMissingRpc(rpcError)) {
        // Fallback local enquanto a migração não foi aplicada.
        const dados = {
          salao_id: salaoId,
          data: dataSelecionada,
          horario: selecao.hora,
          profissional_id: selecao.profId,
          procedimento_id: servicos[0].procId,
          cliente: nomeCliente.toUpperCase(),
          valor_cobrado: 0,
          valor_pago: novo.pago ? servicos.reduce((sum, s) => sum + s.valor_cobrado, 0) : 0,
          status: 'AGENDADO',
          obs: novo.obs || null,
        };

        const { data: atendimentoData, error: atendError } = await supabase.from('atendimentos').insert(dados).select();
        if (atendError) throw atendError;

        const atendimentoId = atendimentoData[0].id;
        const dadosServicosFallback = servicos.map((s, idx) => ({
          atendimento_id: atendimentoId,
          procedimento_id: s.procId,
          comprimento: s.requer_comprimento ? s.tamanho : null,
          valor_indicado: s.valor_indicado,
          valor_cobrado: s.valor_cobrado,
          valor_pago: novo.pago ? s.valor_cobrado : 0,
          sequencia: idx + 1,
        }));

        const { error: procError } = await supabase.from('atendimento_procedimentos').insert(dadosServicosFallback);
        if (procError) throw procError;
      } else {
        if (!rpcData) throw new Error('RPC de criação não retornou o id do atendimento');
      }

      // Toast com resumo dos serviços
      const totalCobrado = servicos.reduce((sum, s) => sum + s.valor_cobrado, 0);
      const resumoServicos = servicos.length === 1 
        ? servicos[0].procNome
        : `${servicos.length} SERVIÇOS`;
       
      showToast(
        `✅ ${nomeCliente} ÀS ${selecao.hora} | ${resumoServicos} | TOTAL: ${fmt(totalCobrado)}`,
        'success'
      );
      setModalAberto(false);
      carregarAtendimentos();
    } catch (err) {
      showToast(`ERRO: ${err.message}`, 'error');
    } finally {
      setSalvando(false);
    }
  };

  // ─── Modal Detalhes/Cancelamento ───
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState(null);
  const [cancelando, setCancelando] = useState(false);
  const [alterandoPagamento, setAlterandoPagamento] = useState(false);

  // ─── Edição de serviços do agendamento ───
  const [modoEdicao, setModoEdicao] = useState(false);
  const [servicosEdicao, setServicosEdicao] = useState([]);
  const [edicaoServicoIdx, setEdicaoServicoIdx] = useState(null);
  const [formEdicao, setFormEdicao] = useState({ procId: '', tamanho: 'P', valor: '' });
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const abrirModoEdicao = () => {
    const lista = (agendamentoSelecionado.procedimentos || []).map(p => ({
      id: p.id, // id da linha em atendimento_procedimentos
      procId: p.procedimento_id,
      procNome: p.procedimento_nome,
      tamanho: p.comprimento || 'P',
      valor_indicado: p.valor_indicado,
      valor_cobrado: p.valor_cobrado,
      requer_comprimento: procedimentos.find(pr => pr.id === p.procedimento_id)?.requer_comprimento ?? true,
    }));
    setServicosEdicao(lista);
    setEdicaoServicoIdx(null);
    setFormEdicao({ procId: '', tamanho: 'P', valor: '' });
    setModoEdicao(true);
  };

  const adicionarServicoEdicao = () => {
    if (!formEdicao.procId || !formEdicao.valor || !validarValorMonetario(formEdicao.valor))
      return showToast('SELECIONE O PROCEDIMENTO E INFORME O VALOR', 'error');
    if (edicaoServicoIdx === null && servicosEdicao.some(s => s.procId === formEdicao.procId))
      return showToast('⚠️ PROCEDIMENTO JÁ ADICIONADO', 'error');

    const proc = procedimentos.find(p => p.id === formEdicao.procId);
    const precoP = Number(proc?.preco_p) || 0;
    let valor_indicado = precoP;
    if (formEdicao.tamanho === 'M') valor_indicado = Number(proc?.preco_m) || precoP * 1.2;
    if (formEdicao.tamanho === 'G') valor_indicado = Number(proc?.preco_g) || precoP * 1.3;

    const item = {
      id: edicaoServicoIdx !== null ? servicosEdicao[edicaoServicoIdx].id : null,
      procId: formEdicao.procId,
      procNome: proc?.nome,
      tamanho: formEdicao.tamanho,
      valor_indicado,
      valor_cobrado: Number(formEdicao.valor),
      valor_pago: Number(agendamentoSelecionado?.valor_pago) > 0 ? Number(formEdicao.valor) : 0,
      requer_comprimento: proc?.requer_comprimento ?? true,
    };

    if (edicaoServicoIdx !== null) {
      const nova = [...servicosEdicao];
      nova[edicaoServicoIdx] = item;
      setServicosEdicao(nova);
    } else {
      setServicosEdicao(prev => [...prev, item]);
    }
    setEdicaoServicoIdx(null);
    setFormEdicao({ procId: '', tamanho: 'P', valor: '' });
  };

  const removerServicoEdicao = (idx) => {
    setServicosEdicao(prev => prev.filter((_, i) => i !== idx));
    if (edicaoServicoIdx === idx) { setEdicaoServicoIdx(null); setFormEdicao({ procId: '', tamanho: 'P', valor: '' }); }
  };

  const salvarEdicaoServicos = async () => {
    if (servicosEdicao.length === 0) return showToast('ADICIONE PELO MENOS UM SERVIÇO', 'error');
    setSalvandoEdicao(true);
    try {
      const atendId = agendamentoSelecionado.id;
      const pagamentoAtivo = Number(agendamentoSelecionado?.valor_pago) > 0;
      const novos = servicosEdicao.map((s, idx) => ({
        procedimento_id: s.procId,
        comprimento: s.requer_comprimento ? s.tamanho : null,
        valor_indicado: s.valor_indicado,
        valor_cobrado: s.valor_cobrado,
        valor_pago: pagamentoAtivo ? s.valor_cobrado : 0,
        sequencia: idx + 1,
      }));

      const { error: rpcError } = await supabase.rpc('substituir_procedimentos_atendimento', {
        p_atendimento_id: atendId,
        p_procedimentos: novos,
      });

      if (rpcError && !isMissingRpc(rpcError)) throw rpcError;

      if (rpcError && isMissingRpc(rpcError)) {
        // Fallback local enquanto a migração não foi aplicada.
        const { error: delErr } = await supabase.from('atendimento_procedimentos').delete().eq('atendimento_id', atendId);
        if (delErr) throw delErr;

        const { error: insErr } = await supabase.from('atendimento_procedimentos').insert(
          novos.map((s, idx) => ({
            atendimento_id: atendId,
            procedimento_id: s.procedimento_id,
            comprimento: s.comprimento,
            valor_indicado: s.valor_indicado,
            valor_cobrado: s.valor_cobrado,
            valor_pago: s.valor_pago,
            sequencia: idx + 1,
          }))
        );
        if (insErr) throw insErr;

        await supabase.from('atendimentos').update({ procedimento_id: servicosEdicao[0].procId }).eq('id', atendId);
      }

      showToast('✅ SERVIÇOS ATUALIZADOS COM SUCESSO!', 'success');
      setModoEdicao(false);
      setModalDetalhesAberto(false);
      carregarAtendimentos();
    } catch (err) {
      showToast('ERRO: ' + err.message, 'error');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  // ─── Sprint 5: Modal Customizado para Mover Agendamento ───
  const [modalMoverAberto, setModalMoverAberto] = useState(false);
  const [moverDados, setMoverDados] = useState(null);

  // ─── Sprint 5: Modal Customizado para Cancelar Agendamento ───
  const [modalCancelarAberto, setModalCancelarAberto] = useState(false);

  const abrirDetalhes = (agend, e) => {
    setAgendamentoSelecionado(agend);
    setModoEdicao(false);
    setModalDetalhesAberto(true);
    setHighlightId(agend.id);
    setTimeout(() => setHighlightId(null), 2500);
    if (e && e.currentTarget) {
      e.currentTarget.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
    }
  };

  const togglePagamento = async () => {
    if (!agendamentoSelecionado) return;
    setAlterandoPagamento(true);

    const novoValorPago = Number(agendamentoSelecionado.valor_pago) > 0 ? 0 : Number(agendamentoSelecionado.valor_cobrado);

    try {
      const { error } = await supabase
        .from('atendimentos')
        .update({ valor_pago: novoValorPago })
        .eq('id', agendamentoSelecionado.id)
        .eq('salao_id', salaoId);

      if (error) throw error;

      // Atualiza o estado local para refletir na UI imediatamente
      setAgendamentoSelecionado(prev => ({ ...prev, valor_pago: novoValorPago }));
      showToast(novoValorPago > 0 ? 'ATENDIMENTO MARCADO COMO PAGO!' : 'ATENDIMENTO MARCADO COMO NÃO PAGO.', 'success');
      carregarAtendimentos(); // Recarrega a grade
    } catch (err) {
      showToast(`ERRO AO ALTERAR PAGAMENTO: ${err.message}`, 'error');
    } finally {
      setAlterandoPagamento(false);
    }
  };

  const cancelarAgendamento = () => {
    if (!agendamentoSelecionado) return;
    // Abre o modal de confirmação
    setModalCancelarAberto(true);
  };

  // ─── Confirmar cancelamento do agendamento ───
  const confirmarCancelarAgendamento = async () => {
    if (!agendamentoSelecionado) return;

    setCancelando(true);
    try {
      const { error } = await supabase
        .from('atendimentos')
        .update({ status: 'CANCELADO' })
        .eq('id', agendamentoSelecionado.id)
        .eq('salao_id', salaoId);

      if (error) throw error;

      showToast('ATENDIMENTO CANCELADO COM SUCESSO!', 'success');
      setModalCancelarAberto(false);
      setModalDetalhesAberto(false);
      carregarAtendimentos();
    } catch (err) {
      showToast(`ERRO: ${err.message}`, 'error');
    } finally {
      setCancelando(false);
    }
  };

  const finalizarAtendimento = async () => {
    if (!agendamentoSelecionado) return;
    setCancelando(true); // Reutilizando estado de loading
    try {
      const { error } = await supabase
        .from('atendimentos')
        .update({ status: 'EXECUTADO' })
        .eq('id', agendamentoSelecionado.id)
        .eq('salao_id', salaoId);

      if (error) throw error;

      showToast('✅ ATENDIMENTO FINALIZADO COM SUCESSO!', 'success');
      setModalDetalhesAberto(false);
      carregarAtendimentos();
    } catch (err) {
      showToast(`ERRO: ${err.message}`, 'error');
    } finally {
      setCancelando(false);
    }
  };

  // ─── Drag and Drop Handler ───
  const handleDrop = async (novoProfId, novaHora) => {
    if (!dragging) return;
    const { agendId, profId: profOrigem, hora: horaOrigem, dataOrigem } = dragging;

    // Sem mudança
    if (novoProfId === profOrigem && novaHora === horaOrigem && dataSelecionada === dataOrigem) {
      setDragging(null);
      setDragOver(null);
      return;
    }

    // 🛡️ Verificar conflito: horário ocupado na profissional de destino?
    const conflito = agendamentos.find(a =>
      a.profissional_id === novoProfId &&
      a.horario?.substring(0, 5) === novaHora &&
      a.id !== agendId
    );

    if (conflito) {
      showToast(`⚠️ ${conflito.cliente} JÁ ESTÁ AGENDADA ÀS ${novaHora} COM ESSA PROFISSIONAL!`, 'error');
      setDragging(null);
      setDragOver(null);
      return;
    }

    // Confirmar mudança de profissional (só se mudou)
    const profDestino = profissionais.find(p => p.id === novoProfId);
    const nomeCliente = dragging.cliente;
    
    // Sprint 5 e 8: Usar modal customizado
    setMoverDados({
      agendId,
      novoProfId,
      novaHora,
      novaData: dataSelecionada,
      dataOrigem,
      profDestino: profDestino?.nome,
      nomeCliente,
    });
    setModalMoverAberto(true);
  };

  // ─── Sprint 5 e 8: Confirmar movimento de agendamento ───
  const confirmarMover = async () => {
    if (!moverDados) return;
    
    try {
      const { error } = await supabase
        .from('atendimentos')
        .update({
          profissional_id: moverDados.novoProfId,
          horario: moverDados.novaHora + ':00',
          data: moverDados.novaData
        })
        .eq('id', moverDados.agendId)
        .eq('salao_id', salaoId);

      if (error) throw error;

      showToast('✅ AGENDAMENTO MOVIDO COM SUCESSO!', 'success');
      setModalMoverAberto(false);
      setMoverDados(null);
      setDragging(null);
      setDragOver(null);
      carregarAtendimentos();
    } catch (err) {
      showToast(`ERRO AO MOVER: ${err.message}`, 'error');
    }
  };
  const getAgendamento = (hora, profId) => {
    return agendamentos.find(a => a.horario?.substring(0, 5) === hora && a.profissional_id === profId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 font-medium text-sm uppercase">Carregando agenda...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-slate-50 min-h-screen font-sans flex flex-col relative">
      {dragging && (
        <div className="fixed top-0 left-0 w-full z-[100] bg-gray-900/90 backdrop-blur-md border-b border-gray-700 p-3 shadow-2xl flex flex-col items-center gap-2 animate-slideDown">
           <p className="text-white text-xs font-black uppercase tracking-widest text-center">Para qual dia deseja mover?</p>
           <div className="flex gap-2 flex-wrap justify-center">
             {nextDays.map(dia => {
               const lbl = new Date(dia + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit'});
               return (
                  <div
                    key={dia}
                    onDragOver={e => { e.preventDefault(); if (dataSelecionada !== dia) setDataSelecionada(dia); }}
                    className={`px-4 py-2 rounded-xl border-2 transition-all cursor-pointer font-bold text-xs uppercase
                      ${dataSelecionada === dia ? 'bg-white text-sky-600 border-white scale-110 shadow-lg shadow-sky-500/50' : 'border-gray-500 text-gray-300 bg-gray-800'}`}
                  >
                    {lbl}
                  </div>
               );
             })}
           </div>
           <p className="text-gray-400 text-[10px] uppercase font-bold mt-1">Passe o mouse sobre o dia desejado e solte na grade de horários abaixo</p>
        </div>
      )}
      <div className="mx-auto w-full max-w-[1400px] flex flex-col">
      {/* ═══ HEADER COM NAVEGAÇÃO DE DATA ═══ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Sparkles size={16} className="text-gray-500" />
            <h1 className="text-2xl font-black bg-gradient-to-r from-blue-950 to-blue-600 bg-clip-text text-transparent uppercase">Agenda</h1>
          </div>
          <p className="text-gray-500 text-sm uppercase">Clique no horário para lançar o faturamento.</p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setModalProfAberto(true)} className="p-2 hover:bg-white rounded-lg transition-all shadow-sm border border-gray-200 bg-white text-sky-600 font-bold text-sm flex items-center gap-2 uppercase" title="Adicionar Profissional">
            <UserPlus size={16} /> <span className="hidden sm:inline">Equipe</span>
          </button>
          <button onClick={() => mudarDia(-1)} className="p-2 hover:bg-white rounded-lg transition-all shadow-sm border border-gray-200 bg-white">
            <ChevronLeft size={16} className="text-gray-500" />
          </button>
          <button onClick={hoje}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm uppercase ${ehHoje ? 'bg-sky-100 text-sky-800 border border-sky-300' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            {ehHoje ? '📅 Hoje' : fmtDataCompleta(dataSelecionada)}
          </button>
          <input type="date" value={dataSelecionada} onChange={e => setDataSelecionada(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400/50 bg-white shadow-sm" />
          <button onClick={() => mudarDia(1)} className="p-2 hover:bg-white rounded-lg transition-all shadow-sm border border-gray-200 bg-white">
            <ChevronRight size={16} className="text-gray-500" />
          </button>
          <button onClick={abrirAjusteDia} className="p-2 hover:bg-white rounded-lg transition-all shadow-sm border border-gray-200 bg-white" title="Ajustar Horário do Dia">
            <Settings size={16} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* ═══ GRADE DE AGENDA ═══ */}
      {/* Aviso se a proprietária não está na planilha */}
      {role === 'PROPRIETARIO' && profissionais.length > 0 && !profissionais.some(p => p.cargo === 'PROPRIETARIO') && (
        <div className="mb-4 bg-sky-50 border border-sky-200 rounded-lg p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-lg">👑</span>
            </div>
            <div>
              <p className="text-sm font-bold text-blue-800 uppercase">Você também atende? Adicione-se à agenda!</p>
              <p className="text-xs text-sky-600 uppercase">Como proprietária, você precisa de uma coluna própria para seus agendamentos.</p>
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                // Busca nome da proprietária do salão
                const { data: salaoData } = await supabase.from('saloes').select('nome_proprietaria, nome').eq('id', salaoId).single();
                const nome = salaoData?.nome_proprietaria || 'PROPRIETÁRIA';
                const { error } = await supabase.from('profissionais').upsert({
                  salao_id: salaoId,
                  nome,
                  cargo: 'PROPRIETARIO',
                  salario_fixo: 0,
                  ativo: true,
                }, { onConflict: 'salao_id,nome' });
                if (error) throw error;
                showToast(`${nome} ADICIONADA À AGENDA! 👑`, 'success');
                // Recarrega profissionais
                const { data: profData } = await supabase.from('profissionais').select('id, nome, cargo').eq('salao_id', salaoId).eq('ativo', true).order('nome');
                setProfissionais(profData || []);
              } catch (err) {
                showToast('ERRO: ' + err.message, 'error');
              }
            }}
            className="flex-shrink-0 px-4 py-2.5 bg-blue-100 text-blue-800 border border-blue-300 rounded-xl font-bold text-sm hover:bg-blue-200 transition-all shadow-sm uppercase"
          >
            Adicionar-me 👑
          </button>
        </div>
      )}

      {/* ═══ AVISO MOBILE ═══ */}
      <div className="block sm:hidden mb-4 bg-sky-50 border border-sky-200 rounded-xl p-4 text-center">
        <p className="text-2xl mb-2">📱</p>
        <p className="text-sm font-black text-blue-800 uppercase">Melhor no computador</p>
        <p className="text-xs text-sky-600 mt-1">A agenda funciona melhor em telas maiores. Gire o celular na horizontal ou acesse pelo computador para ver todos os horários.</p>
      </div>

      {profissionais.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <User size={40} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 font-bold uppercase">Nenhum profissional cadastrado</p>
          <p className="text-xs text-gray-500 mt-1 uppercase">Adicione profissionais nas Configurações</p>
          {role === 'PROPRIETARIO' && (
            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={async () => {
                  try {
                    const { data: salaoData } = await supabase.from('saloes').select('nome_proprietaria, nome').eq('id', salaoId).maybeSingle();
                    const nome = salaoData?.nome_proprietaria || 'PROPRIETÁRIA';
                    const { error } = await supabase.from('profissionais').insert({ salao_id: salaoId, nome, cargo: 'PROPRIETARIO', salario_fixo: 0, ativo: true });
                    if (error) throw error;
                    showToast(`${nome} ADICIONADA À AGENDA! 👑`, 'success');
                    const { data: profData } = await supabase.from('profissionais').select('id, nome, cargo').eq('salao_id', salaoId).eq('ativo', true).order('nome');
                    setProfissionais(profData || []);
                  } catch (err) { showToast('ERRO: ' + err.message, 'error'); }
                }}
                className="px-6 py-3 bg-blue-100 text-blue-800 border border-blue-300 rounded-xl font-bold text-sm hover:bg-blue-200 transition-all shadow-sm uppercase"
              >
                👑 Adicionar-me
              </button>
              <button onClick={() => setModalProfAberto(true)} className="px-6 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm uppercase">
                + Adicionar Outros
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {agendamentos.length === 0 && !loading && (
            <div className="mb-4 bg-sky-50 border border-sky-100 rounded-2xl p-4 flex items-center gap-3 animate-fadeIn">
              <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles size={20} className="text-sky-500" />
              </div>
              <div>
                <p className="text-sm font-black text-sky-800 uppercase tracking-tight">Agenda livre hoje</p>
                <p className="text-xs font-medium text-sky-600 mt-0.5">Nenhum agendamento para esta data. Que tal divulgar promoções aos clientes?</p>
              </div>
            </div>
          )}
          <div className="bg-white border border-gray-300 rounded-sm overflow-hidden shadow-sm overflow-x-auto pb-safe">
            <table className="w-full border-collapse min-w-[600px]">
            <thead>
              <tr>
                <th className="p-3 bg-gray-100 border-b border-r border-gray-300 text-[10px] font-bold text-gray-600 uppercase tracking-widest w-16 text-center">Hora</th>
                {profissionais.map((p, idx) => {
                  const cor = PROF_COLORS[idx % PROF_COLORS.length];
                  return (
                    <th key={p.id} className={`p-0 border-b border-gray-200`}>
                      <div className={`${cor.bg} px-4 py-3 text-gray-800 text-center`}>
                        <span className="text-xs font-bold uppercase tracking-wide">{p.nome}</span>
                        <span className="block text-[9px] font-normal text-gray-800/70 mt-0.5 uppercase">
                          {p.cargo === 'PROPRIETARIO' ? '👑 Proprietária' : '👤 Funcionário(a)'}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {HORARIOS.length === 0 ? (
                <tr>
                  <td colSpan={profissionais.length + 1} className="py-20 text-center bg-gray-50/50">
                    <div className="flex flex-col items-center justify-center gap-3 opacity-60">
                      <span className="text-4xl">😴</span>
                      <p className="text-gray-500 font-bold uppercase text-sm tracking-wide">Salão Fechado Neste Dia</p>
                      <p className="text-gray-400 text-xs font-semibold max-w-xs text-center uppercase">Você pode ajustar o horário deste dia no botão de engrenagem acima.</p>
                    </div>
                  </td>
                </tr>
              ) : HORARIOS.map(hora => (
                <tr key={hora} className="group">
                  <td className="p-1.5 border-b border-r border-gray-300 bg-gray-50 text-center font-bold text-gray-600 text-[10px]">{hora}</td>
                  {profissionais.map((prof, idx) => {
                    const agend = getAgendamento(hora, prof.id);
                    const cor = PROF_COLORS[idx % PROF_COLORS.length];
                    return (
                      <td
                        key={prof.id}
                        className={`p-1 border-b border-r border-gray-200 h-14 transition-all ${!agend ? cor.hover : ''}`}
                      >
                        {agend ? (
                          <div
                            className={`h-full w-full rounded p-1.5 text-[10px] relative overflow-hidden shadow-sm cursor-grab active:cursor-grabbing transition-all duration-500
                              ${dragging?.agendId === agend.id ? 'opacity-40 scale-95' : ''}
                              ${agend.status === 'EXECUTADO' ? 'bg-emerald-500 text-white border-transparent' : `${cor.light} ${cor.text} border ${cor.border}`}
                              ${highlightId === agend.id ? 'animate-highlight-pulse z-10 border-2' : ''}
                              uppercase`}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = 'move';
                              setDragging({ agendId: agend.id, profId: prof.id, hora, dataOrigem: dataSelecionada, cliente: agend.cliente });
                            }}
                            onDragEnd={() => { setDragging(null); setDragOver(null); }}
                            onClick={(e) => abrirDetalhes(agend, e)}
                          >
                            <div className="font-bold truncate">{agend.cliente}</div>
                            <div className="truncate text-[9px] opacity-70">
                              {agend.procedimentos?.length > 1 
                                ? `${agend.procedimentos.length} SERVIÇOS`
                                : agend.procedimentos?.[0]?.procedimento_nome + (agend.procedimentos?.[0]?.comprimento ? ` (${agend.procedimentos[0].comprimento})` : '')
                              }
                            </div>
                            {role === 'PROPRIETARIO' && (
                              <div className={`absolute bottom-0.5 right-1 px-1.5 py-0.5 rounded-full text-[8px] font-black
                                ${agend.status === 'EXECUTADO' ? 'bg-gray-100 text-gray-800'
                                  : Number(agend.lucro_liquido) >= 0 ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-red-100 text-red-600'}`}>
                                {fmt(agend.lucro_liquido)}
                              </div>
                            )}
                            {agend.status === 'EXECUTADO' && (
                              <CheckCircle2 size={10} className="absolute top-1 right-1 text-gray-800/70" />
                            )}
                          </div>
                        ) : (
                          <div
                            className={`h-full w-full flex items-center justify-center transition-all rounded-lg cursor-pointer
                              ${dragOver?.profId === prof.id && dragOver?.hora === hora
                                ? 'bg-sky-50 border-2 border-dashed border-blue-400 scale-95'
                                : 'opacity-0 group-hover:opacity-30'}`}
                            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver({ profId: prof.id, hora }); }}
                            onDragLeave={() => setDragOver(null)}
                            onDrop={(e) => { e.preventDefault(); handleDrop(prof.id, hora); }}
                            onClick={() => abrirAgendamento(hora, prof.id)}
                          >
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
        </>
      )}

      {/* ═══ MODAL NOVO PROFISSIONAL RÁPIDO ═══ */}
      {modalProfAberto && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex justify-center items-center z-50" onClick={() => setModalProfAberto(false)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-gray-800 uppercase">Novo Profissional</h2>
              <button onClick={() => setModalProfAberto(false)} className="p-2 hover:bg-sky-500 rounded-full transition-colors"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-500 mb-1 block">Nome do Profissional</label>
                <input type="text" value={novoProf.nome} onChange={e => setNovoProf({ ...novoProf, nome: e.target.value })} placeholder="EX: ANA SILVA" className="w-full border-2 border-gray-200 rounded-xl p-3 outline-none focus:border-sky-400 font-bold text-sm uppercase transition-colors" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-500 mb-1 block">Cargo</label>
                <select value={novoProf.cargo} onChange={e => setNovoProf({ ...novoProf, cargo: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl p-3 outline-none focus:border-sky-400 font-bold text-sm transition-colors bg-white uppercase">
                  <option value="FUNCIONARIO">COLABORADOR</option>
                  <option value="PROPRIETARIO">PROPRIETÁRIO / SÓCIO</option>
                </select>
              </div>
              <button onClick={criarProfissionalRapido} disabled={salvandoProf} className="w-full py-3 bg-sky-500 text-white rounded-xl font-bold hover:bg-sky-500 transition-colors flex items-center justify-center gap-2 mt-2 uppercase">
                {salvandoProf ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                Adicionar à Equipe
              </button>
            </div>
          </div>
        </div>
      )}
      {modalDetalhesAberto && agendamentoSelecionado && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={() => { setModalDetalhesAberto(false); setModoEdicao(false); }}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 animate-fadeIn max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-gray-800 uppercase">{modoEdicao ? 'Editar Serviços' : 'Detalhes'}</h2>
              <button onClick={() => { setModalDetalhesAberto(false); setModoEdicao(false); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
            </div>

            {modoEdicao ? (
              <div className="space-y-4">
                {/* Lista de serviços editáveis */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {servicosEdicao.map((s, idx) => (
                    <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col gap-2">
                      <div>
                        <p className="font-bold text-sm text-gray-800">{s.procNome} {s.requer_comprimento ? `(${s.tamanho})` : ''}</p>
                        <div className="flex gap-4 mt-1">
                          <p className="text-[10px] text-gray-500 font-bold uppercase">Sugerido: {fmt(s.valor_indicado || s.valor_cobrado)}</p>
                          <p className="text-[10px] text-gray-800 font-black uppercase">Cobrado: {fmt(s.valor_cobrado)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 border-t border-gray-100 pt-2">
                        <button onClick={() => { setEdicaoServicoIdx(idx); setFormEdicao({ procId: s.procId, tamanho: s.tamanho, valor: String(s.valor_cobrado) }); }} className="flex-1 flex justify-center items-center gap-1.5 py-1.5 hover:bg-sky-100 rounded text-sky-600 font-bold text-xs uppercase transition-colors"><Pencil size={14} /> Editar</button>
                        <button onClick={() => removerServicoEdicao(idx)} className="flex-1 flex justify-center items-center gap-1.5 py-1.5 hover:bg-red-100 rounded text-red-500 font-bold text-xs uppercase transition-colors"><Trash2 size={14} /> Remover</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Formulário para adicionar/editar serviço */}
                <div className="border-t pt-4 space-y-3">
                  {edicaoServicoIdx !== null && (
                    <p className="text-[10px] font-black text-yellow-700 bg-yellow-50 border border-yellow-300 rounded px-2 py-1 uppercase">✏️ Editando serviço {edicaoServicoIdx + 1}</p>
                  )}
                  <select
                    className="w-full border-2 border-gray-200 rounded-xl p-3 outline-none focus:border-sky-400 font-bold text-sm bg-white"
                    value={formEdicao.procId}
                    onChange={e => {
                      const proc = procedimentos.find(p => p.id === e.target.value);
                      setFormEdicao(prev => ({ ...prev, procId: e.target.value, valor: String(Number(proc?.preco_p) || '') }));
                    }}
                  >
                    <option value="">SELECIONE O PROCEDIMENTO...</option>
                    {procedimentos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>

                  {formEdicao.procId && procedimentos.find(p => p.id === formEdicao.procId)?.requer_comprimento && (
                    <div className="flex gap-2">
                      {['P', 'M', 'G'].map(t => (
                        <button key={t} onClick={() => {
                          const proc = procedimentos.find(p => p.id === formEdicao.procId);
                          const precoP = Number(proc?.preco_p) || 0;
                          const val = t === 'P' ? precoP : t === 'M' ? (Number(proc?.preco_m) || precoP * 1.2) : (Number(proc?.preco_g) || precoP * 1.3);
                          setFormEdicao(prev => ({ ...prev, tamanho: t, valor: String(val) }));
                        }}
                        className={`flex-1 py-2 rounded-xl font-black border-2 text-sm transition-all ${formEdicao.tamanho === t ? 'bg-sky-500 border-sky-600 text-white' : 'border-gray-200 text-gray-500'}`}>
                          {t === 'P' ? 'Curto' : t === 'M' ? 'Médio' : 'Longo'}
                        </button>
                      ))}
                    </div>
                  )}

                  <input
                    type="number" step="0.01" placeholder="VALOR (R$)"
                    className="w-full border-2 border-gray-200 rounded-xl p-3 outline-none focus:border-sky-400 font-bold text-sm"
                    value={formEdicao.valor}
                    onChange={e => setFormEdicao(prev => ({ ...prev, valor: e.target.value }))}
                  />

                  <div className="flex gap-2">
                    <button onClick={adicionarServicoEdicao} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-1 uppercase">
                      <Plus size={14} />{edicaoServicoIdx !== null ? 'Salvar Edição' : 'Adicionar'}
                    </button>
                    {edicaoServicoIdx !== null && (
                      <button onClick={() => { setEdicaoServicoIdx(null); setFormEdicao({ procId: '', tamanho: 'P', valor: '' }); }} className="px-3 py-2 border-2 border-gray-200 text-gray-500 font-bold text-sm rounded-xl uppercase">Cancelar</button>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-600">Total: <span className="text-blue-600">{fmt(servicosEdicao.reduce((s, i) => s + i.valor_cobrado, 0))}</span></span>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => { setModoEdicao(false); }} className="flex-1 py-3 border-2 border-gray-200 text-gray-600 font-bold rounded-xl text-sm uppercase">Voltar</button>
                  <button onClick={salvarEdicaoServicos} disabled={salvandoEdicao || servicosEdicao.length === 0} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-sm uppercase flex items-center justify-center gap-2 disabled:opacity-50">
                    {salvandoEdicao ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <>
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-[10px] font-black uppercase text-gray-500">Cliente</p>
                <p className="text-lg font-bold text-gray-800">{agendamentoSelecionado.cliente}</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-black uppercase text-gray-500">Procedimentos ({agendamentoSelecionado.procedimentos?.length || 0})</p>
                  <button onClick={abrirModoEdicao} className="flex items-center gap-1 text-[10px] font-black text-sky-600 bg-sky-50 hover:bg-sky-100 px-2 py-1 rounded-lg uppercase transition-colors">
                    <Pencil size={11} /> Editar
                  </button>
                </div>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {agendamentoSelecionado.procedimentos?.map((p, idx) => (
                    <p key={idx} className="font-medium text-gray-600 uppercase text-sm">
                      {p.procedimento_nome} {p.comprimento ? `(${p.comprimento})` : ''} - {fmt(p.valor_cobrado)}
                    </p>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-500">Horário</p>
                  <p className="font-medium text-gray-600">{agendamentoSelecionado.horario?.substring(0, 5)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-500">Profissional</p>
                  <p className="font-medium text-gray-600">{agendamentoSelecionado.profissionais?.nome}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-gray-500">Valor</p>
                <p className="font-medium text-gray-600">{fmt(agendamentoSelecionado.valor_cobrado)}</p>
              </div>

              {agendamentoSelecionado.obs && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  <p className="text-[10px] font-black uppercase text-amber-600 mb-1">Observação</p>
                  <p className="text-sm text-gray-700 font-medium">{agendamentoSelecionado.obs}</p>
                </div>
              )}

              {/* PAGO OU NÃO */}
              <div className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-colors ${Number(agendamentoSelecionado.valor_pago) > 0 ? 'border-emerald-200 bg-emerald-50 hover:border-emerald-300' : 'border-gray-200 bg-white hover:border-gray-200'}`} onClick={togglePagamento}>
                <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${Number(agendamentoSelecionado.valor_pago) > 0 ? 'bg-emerald-500 text-white' : 'bg-sky-100 text-transparent'}`}>
                  {alterandoPagamento ? <Loader2 size={12} className="animate-spin text-emerald-500" /> : <CheckCircle2 size={14} />}
                </div>
                <div className="flex flex-col flex-1">
                  <span className={`text-sm font-bold leading-none uppercase ${Number(agendamentoSelecionado.valor_pago) > 0 ? 'text-emerald-700' : 'text-gray-600'}`}>
                    {Number(agendamentoSelecionado.valor_pago) > 0 ? 'Atendimento Pago' : 'Pagamento Pendente'}
                  </span>
                  <span className="text-[10px] mt-1 opacity-70 uppercase">
                    CLIQUE PARA ALTERAR O STATUS DE PAGAMENTO.
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {agendamentoSelecionado.status !== 'EXECUTADO' && (
                <button
                  onClick={finalizarAtendimento}
                  disabled={cancelando}
                  className="w-full py-4 rounded-xl font-black text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 uppercase"
                >
                  {cancelando ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  Finalizar Atendimento
                </button>
              )}

              <button
                onClick={cancelarAgendamento}
                disabled={cancelando}
                className="w-full py-3 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center gap-2 uppercase"
              >
                {cancelando ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                Cancelar Atendimento
              </button>
            </div>
            </>
            )}
          </div>
        </div>
      )}

      {/* ═══ PAINEL LATERAL (MODAL) ═══ */}
      {/* ═══ MODAL AJUSTE DE HORÁRIO DO DIA ═══ */}
      {modalHorarioDiaAberto && (
        <div className="fixed inset-0 bg-blue-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scaleIn border border-gray-100 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-slate-50">
              <div>
                <h2 className="text-sm font-black text-blue-950 uppercase tracking-wide">Ajustar Horário</h2>
                <p className="text-xs text-gray-500 font-medium uppercase mt-0.5">{fmtDataCompleta(dataSelecionada)}</p>
              </div>
              <button onClick={() => setModalHorarioDiaAberto(false)} className="p-2 bg-white rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shadow-sm">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                <p className="text-xs font-bold text-amber-800 uppercase leading-relaxed">
                  Esta alteração afetará apenas o dia {dataSelecionada.split('-').reverse().join('/')}. Para mudar o padrão da semana inteira, vá em Configurações.
                </p>
              </div>

              <div className="space-y-4">
                <div className={`flex items-center gap-3 p-4 border rounded-xl transition-colors ${horarioDiaConfig.ativo ? 'border-sky-200 bg-sky-50' : 'border-gray-200 bg-gray-50'}`}>
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                    checked={horarioDiaConfig.ativo}
                    onChange={(e) => setHorarioDiaConfig(prev => ({ ...prev, ativo: e.target.checked }))}
                    id="checkboxAtivoDia"
                  />
                  <label htmlFor="checkboxAtivoDia" className="font-bold text-gray-700 text-sm uppercase cursor-pointer">
                    Salão Aberto Neste Dia
                  </label>
                </div>

                {horarioDiaConfig.ativo && (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Abertura</label>
                      <input
                        type="time"
                        className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-sky-500 outline-none text-sm font-bold text-gray-700"
                        value={horarioDiaConfig.abertura}
                        onChange={(e) => setHorarioDiaConfig(prev => ({ ...prev, abertura: e.target.value }))}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Fechamento</label>
                      <input
                        type="time"
                        className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-sky-500 outline-none text-sm font-bold text-gray-700"
                        value={horarioDiaConfig.fechamento}
                        onChange={(e) => setHorarioDiaConfig(prev => ({ ...prev, fechamento: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-slate-50 flex gap-3">
              {config.horariosExcecao && config.horariosExcecao[dataSelecionada] && (
                <button
                  onClick={limparAjusteDia}
                  disabled={salvandoHorarioDia}
                  className="flex-1 bg-white text-red-500 border border-red-200 py-3 rounded-xl font-bold uppercase text-xs hover:bg-red-50 transition-all shadow-sm flex justify-center items-center gap-2"
                >
                  {salvandoHorarioDia ? <Loader2 size={16} className="animate-spin" /> : 'Remover Exceção'}
                </button>
              )}
              <button
                onClick={salvarAjusteDia}
                disabled={salvandoHorarioDia}
                className="flex-1 bg-blue-900 text-white py-3 rounded-xl font-bold uppercase text-xs hover:bg-blue-800 transition-all shadow-lg shadow-blue-900/20 flex justify-center items-center gap-2"
              >
                {salvandoHorarioDia ? <Loader2 size={16} className="animate-spin" /> : 'Salvar Horário'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={() => setModalAberto(false)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-fadeIn p-6"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-xl font-black text-gray-800 uppercase">Novo Atendimento</h2>
                <p className="text-xs text-gray-500 font-bold uppercase">
                  {selecao.hora} — {selecao.profNome}
                  <span className="text-gray-600 ml-2">{fmtDataCompleta(dataSelecionada)}</span>
                </p>
              </div>
              <button onClick={() => setModalAberto(false)} className="p-2 hover:bg-gray-100 text-gray-500 hover:text-gray-800 rounded-full transition-colors"><X /></button>
            </div>

            <div className="space-y-5">

              {/* ═══ CLIENTE COM AUTOCOMPLETE + CADASTRO RÁPIDO ═══ */}
              <div>
                <label className="text-[10px] font-black uppercase text-gray-500 mb-1 block">Cliente</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -tranblue-y-1/2 text-gray-600" />
                  <input
                    type="text"
                    placeholder="BUSCAR OU DIGITAR NOME..."
                    className="w-full border-2 border-gray-200 rounded-xl p-3 pl-9 outline-none focus:border-sky-400 font-bold text-sm uppercase transition-colors"
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
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                      {clientesFiltrados.length > 0 ? (
                        <>
                          {clientesFiltrados.map(c => (
                            <button
                              key={c.id}
                              onClick={() => selecionarCliente(c.nome)}
                              className="w-full text-left px-4 py-3 hover:bg-sky-50 flex items-center justify-between transition-colors border-b border-blue-50 last:border-0"
                            >
                              <div>
                                <span className="font-bold text-sm text-gray-800">{c.nome}</span>
                                {c.telefone && <span className="text-[10px] text-gray-500 ml-2">{c.telefone}</span>}
                              </div>
                              <User size={12} className="text-gray-600" />
                            </button>
                          ))}
                          <button
                            onClick={() => { setModoNovoCliente(true); setShowSugestoes(false); }}
                            className="w-full text-left px-4 py-3 hover:bg-sky-50 flex items-center gap-2 text-sky-600 font-bold text-sm border-t border-gray-200 uppercase"
                          >
                            <UserPlus size={14} />
                            Cadastrar "{buscaCliente.trim()}" como nova cliente
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => { setModoNovoCliente(true); setShowSugestoes(false); }}
                          className="w-full text-left px-4 py-3 hover:bg-sky-50 flex items-center gap-2 text-sky-600 font-bold text-sm uppercase"
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
                    <p className="text-[10px] font-black uppercase text-sky-600 mb-2 flex items-center gap-1 ">
                      <UserPlus size={12} /> Nova cliente: {buscaCliente.trim()}
                    </p>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Phone size={12} className="absolute left-2.5 top-1/2 -tranblue-y-1/2 text-sky-400" />
                        <input
                          type="text"
                          placeholder="WHATSAPP (OPCIONAL)"
                          className="w-full bg-white border border-sky-200 rounded-lg px-3 py-2 pl-8 text-xs outline-none focus:border-sky-400"
                          value={novoClienteTelefone}
                          onChange={e => setNovoClienteTelefone(e.target.value)}
                        />
                      </div>
                      <button
                        onClick={criarClienteRapido}
                        disabled={salvandoCliente}
                        className="bg-sky-500 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-sky-600 transition-colors disabled:opacity-50 flex items-center gap-1 uppercase"
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
                <label className="text-[10px] font-black uppercase text-gray-500 mb-1 block">Procedimento</label>
                <select
                  className="w-full border-2 border-gray-200 rounded-xl p-3 outline-none focus:border-sky-400 font-bold text-sm bg-white transition-colors"
                  value={novo.procId}
                  onChange={e => selecionarProcedimento(e.target.value)}
                >
                  <option value="">SELECIONE...</option>
                  {procedimentos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>

              {/* INFO CARD PRODUTO APLICADO */}
              {(() => {
                const proc = procedimentos.find(p => p.id === novo.procId);
                if (!proc || proc.categoria !== 'PRODUTO_APLICADO') return null;
                return (
                  <div className="mt-2 bg-sky-50 border border-sky-200 rounded-xl p-3">
                    <p className="text-[10px] font-black uppercase text-sky-600 mb-1 flex items-center gap-1 ">
                      <Package size={12} /> Detalhes do Produto
                    </p>
                    <div className="flex items-center justify-between text-xs text-blue-800 uppercase">
                      <span>Rende: <b>{proc.aplicacoes_por_frasco} APLICAÇÕES</b></span>
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
                    <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block">Comprimento</label>
                    <div className="flex gap-3">
                      {['P', 'M', 'G'].map(t => (
                        <button key={t}
                          onClick={() => selecionarTamanho(t)}
                          className={`flex-1 py-3 rounded-xl font-black border-2 transition-all ${novo.tamanho === t
                            ? 'bg-sky-500 border-blue-600 text-gray-800 shadow-lg shadow-sky-200/50'
                            : 'border-gray-200 text-gray-500 hover:border-gray-200'
                            }`}
                        >
                          {t === 'P' ? 'Curto' : t === 'M' ? 'Médio' : 'Longo'}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* ═══ SPRINT 7.2: BLOCO DE VALOR COBRADO (HERO) ═══ */}
              <div className={`rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                role === 'PROPRIETARIO' && previewFinanceiro?.prejuizo && !ignorarPrejuizo
                  ? 'border-red-400'
                  : 'border-gray-900'
              }`}>

                {/* — Cabeçalho do bloco — */}
                <div className={`px-4 pt-4 pb-3 ${
                  role === 'PROPRIETARIO' && previewFinanceiro?.prejuizo && !ignorarPrejuizo
                    ? 'bg-red-50'
                    : 'bg-gray-900'
                }`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                    role === 'PROPRIETARIO' && previewFinanceiro?.prejuizo && !ignorarPrejuizo
                      ? 'text-red-500'
                      : 'text-gray-400'
                  }`}>Valor Real Cobrado</p>
                  <input
                    type="number" step="0.01"
                    className={`w-full bg-transparent text-5xl font-black outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                      role === 'PROPRIETARIO' && previewFinanceiro?.prejuizo && !ignorarPrejuizo
                        ? 'text-red-600'
                        : 'text-white'
                    }`}
                    onFocus={e => e.target.select()}
                    value={novo.valor}
                    onChange={e => setNovo({ ...novo, valor: e.target.value })}
                    placeholder="0,00"
                  />
                  <p className={`text-[10px] mt-1 font-medium ${
                    role === 'PROPRIETARIO' && previewFinanceiro?.prejuizo && !ignorarPrejuizo
                      ? 'text-red-400'
                      : 'text-gray-500'
                  }`}>O salão define este valor. O sistema apenas sugere.</p>
                </div>

                {/* — Suçestão discreta — */}
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
                    <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Sugestão do sistema:</span>
                        <span className="text-[10px] font-black text-gray-500">{mostrarSugerido ? fmt(sugerido) : '•••'}</span>
                        <button onClick={() => setMostrarSugerido(!mostrarSugerido)} className="text-gray-400 hover:text-gray-600 transition-colors">
                          {mostrarSugerido ? <EyeOff size={11} /> : <Eye size={11} />}
                        </button>
                      </div>
                      <button
                        onClick={() => setNovo(prev => ({ ...prev, valor: sugerido }))}
                        className="text-[9px] font-black text-gray-500 hover:text-gray-700 underline uppercase transition-colors"
                      >
                        Usar sugestão
                      </button>
                    </div>
                  );
                })()}

                {/* — Bloco educativo — */}
                {novo.procId && (
                  <div className="px-4 py-3 bg-sky-50 border-t border-sky-100 flex items-start gap-2">
                    <span className="text-base leading-none mt-0.5">💡</span>
                    <p className="text-[10px] text-sky-700 font-medium leading-relaxed">
                      <span className="font-black">Como funciona?</span> O sistema sugere um valor baseado na sua precificação. Você pode cobrar mais ou menos. O faturamento e o lucro serão calculados usando o valor que você definir aqui.
                    </p>
                  </div>
                )}

                {/* — Indicadores financeiros (só PROPRIETARIO) — */}
                {role === 'PROPRIETARIO' && previewFinanceiro && (
                  <div className="px-4 py-4 bg-white border-t border-gray-100 space-y-4">

                    {/* Cards Margem + Lucro Real */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`rounded-xl p-3 border ${
                        previewFinanceiro.margemReal < 0
                          ? 'bg-red-50 border-red-200'
                          : previewFinanceiro.margemReal < 15
                          ? 'bg-gray-50 border-gray-200'
                          : 'bg-emerald-50 border-emerald-200'
                      }`}>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Margem</p>
                        <p className={`text-2xl font-black ${
                          previewFinanceiro.margemReal < 0 ? 'text-red-600'
                          : previewFinanceiro.margemReal < 15 ? 'text-gray-600'
                          : 'text-emerald-600'
                        }`}>{fmtPct(previewFinanceiro.margemReal)}</p>
                      </div>
                      <div className={`rounded-xl p-3 border ${
                        ignorarPrejuizo ? 'bg-gray-50 border-gray-200'
                        : previewFinanceiro.prejuizo ? 'bg-red-50 border-red-200'
                        : 'bg-emerald-50 border-emerald-200'
                      }`}>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Lucro Real</p>
                        <p className={`text-2xl font-black ${
                          ignorarPrejuizo ? 'text-gray-500'
                          : previewFinanceiro.prejuizo ? 'text-red-600'
                          : 'text-emerald-600'
                        }`}>{ignorarPrejuizo ? '—' : fmt(previewFinanceiro.lucroLiquido)}</p>
                      </div>
                    </div>

                    {/* Calculadora financeira didática */}
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 font-mono text-[11px]">
                      <div className="flex justify-between py-1">
                        <span className="text-gray-500 uppercase">Faturamento</span>
                        <span className="font-black text-gray-700">{fmt(previewFinanceiro.valorBruto)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-red-400 uppercase">(-) Custo Fixo</span>
                        <span className="text-red-500 font-bold">- {fmt(previewFinanceiro.custoFixo)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-red-400 uppercase">(-) Material</span>
                        <span className="text-red-500 font-bold">- {fmt(previewFinanceiro.custoProduto)}</span>
                      </div>
                      <div className="border-t border-gray-200 mt-1 pt-2 flex justify-between">
                        <span className="text-emerald-600 font-black uppercase">(=) Lucro Real</span>
                        <span className={`font-black ${
                          previewFinanceiro.prejuizo ? 'text-red-600' : 'text-emerald-600'
                        }`}>{fmt(previewFinanceiro.lucroLiquido)}</span>
                      </div>
                    </div>

                    {/* Alerta de prejuízo */}
                    {previewFinanceiro.prejuizo && !ignorarPrejuizo && (
                      <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-1.5 text-red-600">
                          <AlertTriangle size={14} />
                          <span className="text-[10px] font-black uppercase">Este valor gera prejuízo!</span>
                        </div>
                        <button onClick={() => setIgnorarPrejuizo(true)}
                          className="text-[9px] font-black text-gray-400 hover:text-gray-600 underline uppercase">
                          Ignorar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ═══ SPRINT 3: LISTAGEM DE SERVIÇOS ADICIONADOS ═══ */}
              {edicaoServico !== null && (
                <div className="bg-yellow-50 border border-yellow-400 text-yellow-800 rounded-lg px-3 py-2 text-xs flex items-center gap-2">
                  ✏️ <span className="font-bold uppercase">Editando serviço {edicaoServico + 1} da lista</span> — altere os dados e clique em salvar
                </div>
              )}

              {servicos.length > 0 && (
                <div className={`border-2 rounded-xl p-4 space-y-3 transition-colors ${edicaoServico !== null ? 'bg-yellow-50 border-yellow-400' : 'bg-blue-50 border-blue-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Package size={16} className="text-blue-600" />
                    <p className="text-sm font-black text-blue-800 uppercase">SERVIÇOS ADICIONADOS ({servicos.length})</p>
                  </div>
                  
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {servicos.map((s, idx) => (
                      <div key={s.id} className="bg-white border-l-4 border-blue-400 p-3 rounded-lg flex flex-col hover:bg-gray-50 transition-colors gap-2 shadow-sm">
                        <div>
                          <p className="font-bold text-sm text-gray-800">{s.procNome} {s.requer_comprimento && <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] ml-1">{s.tamanho}</span>}</p>
                          <div className="flex gap-3 mt-1 items-baseline">
                            <p className="text-[10px] text-gray-400 font-medium uppercase line-through">Sug: {fmt(s.valor_indicado || s.valor_cobrado)}</p>
                            <p className="text-sm text-gray-900 font-black uppercase">Cobrado: {fmt(s.valor_cobrado)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 border-t border-gray-100 pt-2">
                          <button
                            onClick={() => editarServico(idx)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 hover:bg-sky-50 rounded transition-colors text-sky-600 font-bold text-xs uppercase"
                          >
                            <Pencil size={14} /> Editar
                          </button>
                          <button
                            onClick={() => removerServico(idx)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 hover:bg-red-50 rounded transition-colors text-red-500 font-bold text-xs uppercase"
                          >
                            <Trash2 size={14} /> Remover
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Botão Adicionar/Salvar Serviço */}
                  {novo.procId && novo.valor && (
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={adicionarServico}
                        className={`w-full mt-2 py-2 text-white font-bold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors uppercase ${edicaoServico !== null ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                      >
                        <Plus size={14} />
                        {edicaoServico !== null ? '✏️ SALVAR EDIÇÃO DO SERVIÇO' : 'Adicionar Serviço'}
                      </button>
                      {edicaoServico !== null && (
                        <button
                          onClick={() => {
                            setEdicaoServico(null);
                            setNovo(prev => ({ ...prev, procId: '', valor: '', tamanho: 'P' }));
                          }}
                          className="text-xs text-gray-500 underline text-center hover:text-gray-700 transition-colors"
                        >
                          Cancelar edição
                        </button>
                      )}
                    </div>
                  )}

                  {/* Resumo de Totais */}
                  <div className="mt-3 pt-3 border-t-2 border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-2 rounded">
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-gray-700">TOTAL A COBRAR:</span>
                      <span className="text-lg text-blue-600">{fmt(servicos.reduce((sum, s) => sum + s.valor_cobrado, 0))}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Botão para adicionar primeiro serviço (quando não há nenhum) */}
              {servicos.length === 0 && novo.procId && novo.valor && (
                <button
                  onClick={adicionarServico}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-black text-base rounded-xl flex items-center justify-center gap-2 transition-all transform hover:scale-105 uppercase"
                >
                  <Plus size={16} />
                  ➕ Adicionar Serviço À Lista
                </button>
              )}
              <div>
                <label className="text-[10px] font-black uppercase text-gray-500 mb-1 block">Observação</label>
                <input type="text" placeholder="OPCIONAL..."
                  className="w-full border-2 border-gray-200 rounded-xl p-3 outline-none focus:border-sky-400 text-sm transition-colors"
                  value={novo.obs} onChange={e => setNovo({ ...novo, obs: e.target.value.toUpperCase() })} />
              </div>

              {/* PAGO OU NÃO */}
              <div className="flex items-center gap-2 p-3 border-2 border-gray-200 rounded-xl bg-white cursor-pointer transition-colors hover:border-sky-200" onClick={() => setNovo({ ...novo, pago: !novo.pago })}>
                <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${novo.pago ? 'bg-emerald-500 text-white' : 'bg-sky-100 text-transparent'}`}>
                  <CheckCircle2 size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-600 leading-none uppercase">Atendimento já foi pago?</span>
                  <span className="text-[10px] text-gray-500 mt-1 uppercase">Marque se a cliente já realizou o pagamento.</span>
                </div>
              </div>

              {/* BOTÃO SALVAR */}
              <button
                onClick={salvar}
                disabled={salvando || servicos.length === 0}
                className={`w-full py-4 rounded-2xl font-black text-lg transition-all shadow-xl flex items-center justify-center gap-2 ${salvando ? 'bg-sky-200 text-gray-500 cursor-not-allowed' : servicos.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' :
                  'bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700'
                  }`}
              >
                {salvando ? (
                  <><Loader2 size={20} className="animate-spin" /> SALVANDO...</>
                ) : servicos.length === 0 ? (
                  'ADICIONE UM SERVIÇO PARA CONTINUAR'
                ) : (
                  `✅ CONFIRMAR AGENDAMENTO (${servicos.length} SERVIÇO${servicos.length > 1 ? 'S' : ''})`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SPRINT 7: MODAL PREMIUM PARA MOVER AGENDAMENTO ═══ */}
      {modalMoverAberto && moverDados && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setModalMoverAberto(false); setDragging(null); setDragOver(null); }}>
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-lg mx-4 animate-fadeIn flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Mover Agendamento</h2>
              <button onClick={() => { setModalMoverAberto(false); setDragging(null); setDragOver(null); }} className="p-2 bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><X size={18} /></button>
            </div>

            <div className="mb-6">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Cliente</p>
              <p className="text-2xl font-black text-gray-800">{moverDados.nomeCliente}</p>
            </div>

            <div className="flex items-center justify-between gap-2 mb-8 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              {/* De */}
              <div className="flex-1 flex flex-col items-center text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Horário Atual</p>
                <p className="text-lg font-black text-gray-600">{dragging?.hora}</p>
                <p className="text-xs font-bold text-gray-500 truncate w-full max-w-[120px]">{profissionais.find(p => p.id === dragging?.profId)?.nome}</p>
              </div>

              {/* Seta */}
              <div className="flex-shrink-0 text-sky-400 bg-sky-50 p-2 rounded-full">
                <ChevronRight size={24} className="animate-pulse" />
              </div>

              {/* Para */}
              <div className="flex-1 flex flex-col items-center text-center bg-sky-50 rounded-xl p-3 border border-sky-200">
                <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest mb-1">Novo Horário</p>
                <p className="text-xl font-black text-blue-700">{moverDados.novaHora}</p>
                <p className="text-xs font-bold text-blue-800 truncate w-full max-w-[120px]">{moverDados.profDestino}</p>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 mt-auto">
              <button
                onClick={() => {
                  setModalMoverAberto(false);
                  setMoverDados(null);
                  setDragging(null);
                  setDragOver(null);
                }}
                className="flex-1 py-3.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors uppercase text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarMover}
                className="flex-[2] py-3.5 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 uppercase text-sm"
              >
                Confirmar Mudança
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SPRINT 5: MODAL CUSTOMIZADO PARA CANCELAR AGENDAMENTO ═══ */}
      {modalCancelarAberto && agendamentoSelecionado && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setModalCancelarAberto(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-fadeIn" onClick={e => e.stopPropagation()}>
            {/* Ícone de alerta */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={32} className="text-red-600" />
              </div>
            </div>

            {/* Conteúdo */}
            <h2 className="text-2xl font-black text-center text-gray-800 uppercase mb-2">Cancelar Agendamento</h2>
            
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 my-6 text-center">
              <p className="text-gray-600 font-bold uppercase mb-2">
                Deseja cancelar o agendamento de
              </p>
              <p className="text-2xl font-black text-red-700 mb-3">{agendamentoSelecionado.cliente}</p>
              <p className="text-sm text-gray-600 uppercase">
                às <span className="font-bold text-red-600">{agendamentoSelecionado.horario?.substring(0, 5)}</span>?
              </p>
              <p className="text-xs text-red-600 mt-3 font-bold">
                ⚠️ Esta ação não pode ser desfeita.
              </p>
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={() => setModalCancelarAberto(false)}
                disabled={cancelando}
                className="flex-1 py-3 rounded-xl font-bold text-gray-700 border-2 border-gray-200 hover:bg-gray-50 transition-colors uppercase text-sm disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                onClick={confirmarCancelarAgendamento}
                disabled={cancelando}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 transition-all shadow-lg uppercase text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancelando ? <Loader2 size={16} className="animate-spin" /> : '🚫'}
                Sim, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);
