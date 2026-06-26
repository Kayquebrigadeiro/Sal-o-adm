import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { Plus, Edit2, Trash2, ShieldCheck, Users, AlertCircle, Copy, MessageCircle, CreditCard, Clock, Loader2, Lock, RefreshCw } from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Configuracoes({ salaoId, role }) {
  const { showToast } = useToast();
  const [profissionais, setProfissionais] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Abas
  const [abaAtiva, setAbaAtiva] = useState('equipe'); // 'equipe' | 'plano' | 'funcionamento'

  // Horários de Funcionamento
  const [horariosSemana, setHorariosSemana] = useState(null);
  const [loadingHorarios, setLoadingHorarios] = useState(false);

  // Modal Profissionais
  const [modalProf, setModalProf] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({
    nome: '',
    cargo: 'FUNCIONARIO',
    salario_fixo: '',
    porcentagem_comissao: '',
    ativo: true
  });

  // Assinatura
  const [assinatura, setAssinatura] = useState(null);
  const [loadingAssinatura, setLoadingAssinatura] = useState(false);
  const [erroAssinatura, setErroAssinatura] = useState(null);
  const [modalPix, setModalPix] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [confirmacao, setConfirmacao] = useState(null);

  // Proteção do Dashboard
  const [dashboardProtection, setDashboardProtection] = useState(false);
  const [dashboardPin, setDashboardPin] = useState(null);
  const [loadingProtection, setLoadingProtection] = useState(false);

  // Variáveis PIX (.env)
  const chavePix = import.meta.env.VITE_PIX_CHAVE;
  const nomePix  = import.meta.env.VITE_PIX_NOME;
  const wpp      = import.meta.env.VITE_WHATSAPP_SUPORTE;
  const pixCopiaCola = import.meta.env.VITE_PIX_COPIA_COLA;

  useEffect(() => {
    if (salaoId) carregarProfissionais(true);
  }, [salaoId]);

  // Carregar config de proteção do Dashboard
  useEffect(() => {
    if (salaoId && abaAtiva === 'equipe') carregarProtecaoDashboard();
  }, [salaoId, abaAtiva]);

  const carregarProtecaoDashboard = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('dashboard_protection_enabled, dashboard_pin')
        .eq('salao_id', salaoId)
        .maybeSingle();
      if (error) throw error;
      setDashboardProtection(data?.dashboard_protection_enabled ?? false);
      setDashboardPin(data?.dashboard_pin ?? null);
    } catch (err) {
      console.error('Erro ao carregar proteção:', err);
    }
  };

  const gerarPin = () => String(Math.floor(1000 + Math.random() * 9000));

  const toggleProtecaoDashboard = async () => {
    setLoadingProtection(true);
    try {
      const novoEstado = !dashboardProtection;
      const novoPin = novoEstado ? gerarPin() : null;

      const { error } = await supabase
        .from('configuracoes')
        .update({
          dashboard_protection_enabled: novoEstado,
          dashboard_pin: novoPin,
        })
        .eq('salao_id', salaoId);

      if (error) throw error;

      setDashboardProtection(novoEstado);
      setDashboardPin(novoPin);
      showToast(
        novoEstado ? 'PROTEÇÃO DO DASHBOARD ATIVADA!' : 'PROTEÇÃO DO DASHBOARD DESATIVADA',
        'success'
      );
    } catch (err) {
      showToast('ERRO AO ALTERAR PROTEÇÃO', 'error');
    } finally {
      setLoadingProtection(false);
    }
  };

  const redefinirPin = async () => {
    setLoadingProtection(true);
    try {
      const novoPin = gerarPin();
      const { error } = await supabase
        .from('configuracoes')
        .update({ dashboard_pin: novoPin })
        .eq('salao_id', salaoId);
      if (error) throw error;
      setDashboardPin(novoPin);
      showToast('NOVO PIN GERADO COM SUCESSO!', 'success');
    } catch (err) {
      showToast('ERRO AO REDEFINIR PIN', 'error');
    } finally {
      setLoadingProtection(false);
    }
  };

  useEffect(() => {
    if (abaAtiva === 'plano' && !assinatura && salaoId) {
      carregarAssinatura();
    }
  }, [abaAtiva, salaoId]);

  useEffect(() => {
    if (abaAtiva === 'funcionamento' && !horariosSemana && salaoId) {
      carregarHorarios();
    }
  }, [abaAtiva, salaoId]);

  const carregarHorarios = async () => {
    setLoadingHorarios(true);
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('horarios_semana')
        .eq('salao_id', salaoId)
        .maybeSingle();

      if (error) throw error;
      
      if (data && data.horarios_semana) {
        setHorariosSemana(data.horarios_semana);
      } else {
        // Fallback default
        setHorariosSemana({
          "0": { ativo: false, abertura: "08:00", fechamento: "19:00" },
          "1": { ativo: true, abertura: "08:00", fechamento: "19:00" },
          "2": { ativo: true, abertura: "08:00", fechamento: "19:00" },
          "3": { ativo: true, abertura: "08:00", fechamento: "19:00" },
          "4": { ativo: true, abertura: "08:00", fechamento: "19:00" },
          "5": { ativo: true, abertura: "08:00", fechamento: "19:00" },
          "6": { ativo: true, abertura: "08:00", fechamento: "15:00" }
        });
      }
    } catch (err) {
      showToast('ERRO AO CARREGAR HORÁRIOS', 'error');
    } finally {
      setLoadingHorarios(false);
    }
  };

  const salvarHorarios = async () => {
    setLoadingHorarios(true);
    try {
      const { error } = await supabase
        .from('configuracoes')
        .update({ horarios_semana: horariosSemana })
        .eq('salao_id', salaoId);

      if (error) throw error;
      showToast('HORÁRIOS SALVOS COM SUCESSO!', 'success');
    } catch (err) {
      showToast('ERRO AO SALVAR HORÁRIOS', 'error');
    } finally {
      setLoadingHorarios(false);
    }
  };

  const carregarAssinatura = async () => {
    setLoadingAssinatura(true);
    setErroAssinatura(null);
    try {
      const { data, error } = await supabase.rpc('verificar_acesso_salao', { p_salao_id: salaoId });
      if (error) throw error;
      setAssinatura(data);
    } catch (err) {
      console.error(err);
      setErroAssinatura('Não foi possível carregar as informações do plano no momento.');
    } finally {
      setLoadingAssinatura(false);
    }
  };

  const copiarChave = () => {
    navigator.clipboard.writeText(pixCopiaCola || chavePix);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const carregarProfissionais = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    const { data, error } = await supabase
      .from('profissionais')
      .select('*')
      .eq('salao_id', salaoId)
      .eq('ativo', true)
      .order('nome');
      
    if (error) {
      console.error("ERRO AO CARREGAR PROFISSIONAIS:", error);
      showToast('ERRO AO CARREGAR EQUIPE. O Supabase pode estar atualizando o cache.', 'error');
    }
    
    setProfissionais(data || []);
    if (isInitial) setLoading(false);
  };

  const salvarProfissional = async () => {
    if (!form.nome) return showToast('O NOME É OBRIGATÓRIO', 'error');

    const dadosSalvar = {
      ...form,
      salao_id: salaoId,
      salario_fixo: Number(form.salario_fixo || 0),
      porcentagem_comissao: form.porcentagem_comissao ? Number(form.porcentagem_comissao) : null,
      ativo: true
    };

    let error;
    if (editando) {
      const { error: err } = await supabase.from('profissionais').update(dadosSalvar).eq('id', editando.id).eq('salao_id', salaoId);
      error = err;
    } else {
      const { error: err } = await supabase.from('profissionais').upsert([dadosSalvar], { onConflict: 'salao_id,nome' });
      error = err;
    }

    if (error) showToast('ERRO AO SALVAR', 'error');
    else {
      showToast('PROFISSIONAL SALVO COM SUCESSO!', 'success');
      setModalProf(false);
      carregarProfissionais();
    }
  };

  const deletarProfissional = async (id) => {
    try {
      await supabase.from('profissionais').update({ ativo: false }).eq('id', id).eq('salao_id', salaoId);
      showToast('PROFISSIONAL REMOVIDO', 'success');
      carregarProfissionais();
    } catch (err) {
      showToast('ERRO AO REMOVER', 'error');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fadeIn">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight uppercase">Configurações</h1>
          <p className="text-gray-500 uppercase">Gerencie a equipe e sua assinatura.</p>
        </div>
        {abaAtiva === 'equipe' && (
          <button
            onClick={() => { setEditando(null); setForm({ nome: '', cargo: 'FUNCIONARIO', salario_fixo: '', porcentagem_comissao: '', ativo: true }); setModalProf(true); }}
            className="bg-white text-gray-800 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-sky-500 hover:text-white transition-all shadow-lg shadow-blue-200 uppercase text-sm"
          >
            <Plus size={18} /> Novo Profissional
          </button>
        )}
      </div>

      {role === 'PROPRIETARIO' && (
        <div className="flex gap-4 mb-8 border-b border-gray-200 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setAbaAtiva('equipe')}
            className={`px-4 py-3 font-bold uppercase transition-all whitespace-nowrap border-b-2 text-sm ${abaAtiva === 'equipe' ? 'border-blue-900 text-gray-800' : 'border-transparent text-gray-500 hover:text-gray-500 hover:bg-gray-50'}`}
          >
            Equipe & Parceiros
          </button>
          <button
            onClick={() => setAbaAtiva('funcionamento')}
            className={`px-4 py-3 font-bold uppercase transition-all whitespace-nowrap border-b-2 text-sm ${abaAtiva === 'funcionamento' ? 'border-blue-900 text-gray-800' : 'border-transparent text-gray-500 hover:text-gray-500 hover:bg-gray-50'}`}
          >
            Funcionamento
          </button>
          {/* DESATIVADO TEMPORARIAMENTE
          <button
            onClick={() => setAbaAtiva('plano')}
            className={`px-4 py-3 font-bold uppercase transition-all whitespace-nowrap border-b-2 text-sm ${abaAtiva === 'plano' ? 'border-blue-900 text-gray-800' : 'border-transparent text-gray-500 hover:text-gray-500 hover:bg-gray-50'}`}
          >
            Meu Plano
          </button>
          */}
        </div>
      )}

      {/* ABA EQUIPE */}
      {abaAtiva === 'equipe' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
        {profissionais.map(prof => (
          <div key={prof.id} className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex items-center justify-between group hover:border-gray-200 transition-all">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${prof.cargo === 'PROPRIETARIO' ? 'bg-white text-gray-800' : 'bg-sky-50 text-gray-500'}`}>
                {prof.nome.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  {prof.nome}
                  {prof.cargo === 'PROPRIETARIO' && <ShieldCheck size={14} className="text-gray-500" title="Proprietário" />}
                </h3>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">
                  {prof.cargo} 
                  {prof.salario_fixo > 0 ? ` • Fixo: ${fmt(prof.salario_fixo)}` : ''}
                  {prof.porcentagem_comissao ? ` • Comiss.: ${prof.porcentagem_comissao}%` : ''}
                </p>
              </div>
            </div>

            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => { setEditando(prof); setForm(prof); setModalProf(true); }}
                className="p-2 hover:bg-sky-500 rounded-xl text-gray-500 hover:text-gray-500"
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={() => setConfirmacao({
                  title: 'REMOVER PROFISSIONAL',
                  message: 'REMOVER ESTE PROFISSIONAL DA EQUIPE?',
                  confirmLabel: 'REMOVER',
                  tone: 'danger',
                  onConfirm: async () => {
                    setConfirmacao(null);
                    await deletarProfissional(prof.id);
                  },
                })}
                className="p-2 hover:bg-red-50 rounded-xl text-red-400 hover:text-red-600"
                title="Remover Profissional"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* SEÇÃO SEGURANÇA — Proteção do Dashboard */}
      {role === 'PROPRIETARIO' && (
        <div className="mt-8 bg-white rounded-3xl border border-gray-200 p-6 shadow-sm animate-fadeIn">
          <h2 className="text-lg font-black text-gray-800 uppercase mb-6 flex items-center gap-3">
            <Lock className="text-gray-500" size={20} /> Segurança do Dashboard
          </h2>

          {/* Switch de proteção */}
          <div className="flex items-center justify-between p-4 rounded-2xl border border-gray-200 bg-gray-50">
            <div className="flex-1">
              <p className="font-bold text-gray-800 text-sm uppercase">Exigir PIN ao acessar o Dashboard Financeiro</p>
              <p className="text-xs text-gray-500 mt-1 uppercase">
                Quando ativado, será necessário informar um PIN de 4 dígitos para abrir o Dashboard e sempre que você sair da aba.
              </p>
            </div>
            <button
              onClick={toggleProtecaoDashboard}
              disabled={loadingProtection}
              className={`relative w-14 h-7 rounded-full transition-all duration-300 flex-shrink-0 ml-4 ${
                dashboardProtection ? 'bg-sky-500' : 'bg-gray-300'
              } ${loadingProtection ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${
                dashboardProtection ? 'left-7' : 'left-0.5'
              }`} />
            </button>
          </div>

          {/* PIN atual + redefinir */}
          {dashboardProtection && dashboardPin && (
            <div className="mt-4 p-4 bg-sky-50 border border-sky-200 rounded-2xl animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Seu PIN Atual</p>
                  <p className="text-3xl font-black text-sky-600 tracking-[0.4em]">{dashboardPin}</p>
                </div>
                <button
                  onClick={redefinirPin}
                  disabled={loadingProtection}
                  className="flex items-center gap-2 bg-white text-gray-600 px-4 py-2.5 rounded-xl text-xs font-black uppercase hover:bg-sky-500 hover:text-white transition-all shadow-sm border border-gray-200 disabled:opacity-50"
                >
                  <RefreshCw size={14} /> Redefinir PIN
                </button>
              </div>
              <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl p-3">
                <p className="text-xs font-bold text-orange-600 uppercase">
                  ⚠️ Memorize este PIN. Se esquecer, você poderá redefinir usando sua senha de login diretamente no Dashboard.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
        </>
      )}

      {/* MODAL DE CADASTRO/EDIÇÃO */}
      <Modal open={modalProf} onClose={() => setModalProf(false)} title={editando ? "EDITAR PROFISSIONAL" : "NOVO PROFISSIONAL"}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-gray-600 mb-1 block uppercase">Nome Completo</label>
            <input
              type="text" className="w-full border-2 border-gray-200 p-3 rounded-2xl focus:border-sky-500 outline-none transition-all"
              value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value.toUpperCase() })}
              placeholder="EX: MARIA SILVA"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-gray-600 mb-1 block uppercase">Cargo / Papel</label>
              <select
                className="w-full border-2 border-gray-200 p-3 rounded-2xl focus:border-sky-500 outline-none uppercase"
                value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })}
              >
                <option value="FUNCIONARIO">COLABORADOR</option>
                <option value="PROPRIETARIO">SÓCIO / PROPRIETÁRIO</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-bold text-gray-600 mb-1 block uppercase">Salário Fixo (Mês)</label>
              <div className="relative">
                <span className="absolute left-3 top-3.5 text-gray-500 text-sm">R$</span>
                <input
                  type="number" className="w-full border-2 border-gray-200 p-3 pl-10 rounded-2xl focus:border-sky-500 outline-none"
                  value={form.salario_fixo} onChange={e => setForm({ ...form, salario_fixo: e.target.value })}
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-bold text-gray-600 mb-1 block uppercase">Comissão Padrão (Opcional)</label>
              <div className="relative">
                <input
                  type="number" className="w-full border-2 border-gray-200 p-3 pr-10 rounded-2xl focus:border-sky-500 outline-none"
                  value={form.porcentagem_comissao} onChange={e => setForm({ ...form, porcentagem_comissao: e.target.value })}
                  placeholder="Ex: 50"
                  max="100"
                />
                <span className="absolute right-4 top-3.5 text-gray-500 font-bold">%</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-sky-50 rounded-2xl border border-sky-100 uppercase">
            <div className="flex gap-3">
              <Users className="text-gray-500" size={20} />
              <p className="text-xs text-sky-600 leading-relaxed">
                <strong>Nota Importante:</strong> A comissão exata também pode ser definida por <strong>procedimento</strong> na aba de Precificação/Serviços. O valor preenchido aqui serve de base para os profissionais.
              </p>
            </div>
          </div>

          <button
            onClick={salvarProfissional}
            className="w-full bg-white text-gray-800 py-4 rounded-2xl font-bold hover:bg-sky-500 hover:text-white transition-all shadow-lg shadow-blue-200 mt-4 uppercase"
          >
            {editando ? "Salvar Alterações" : "Cadastrar na Equipe"}
          </button>
        </div>
      </Modal>

      {/* ABA FUNCIONAMENTO */}
      {abaAtiva === 'funcionamento' && role === 'PROPRIETARIO' && (
        <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm max-w-2xl mx-auto animate-fadeIn">
          <h2 className="text-xl font-black text-gray-800 uppercase mb-8 flex items-center gap-3">
            <Clock className="text-gray-500" size={24} /> Horário de Funcionamento
          </h2>
          
          {loadingHorarios && !horariosSemana ? (
            <div className="flex items-center justify-center py-12">
               <span className="animate-spin w-8 h-8 border-4 border-gray-200 border-t-blue-900 rounded-full"></span>
            </div>
          ) : horariosSemana ? (
            <div className="space-y-4">
              {['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'].map((dia, idx) => (
                <div key={idx} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-colors gap-4 ${horariosSemana[idx]?.ativo ? 'border-sky-200 bg-sky-50/30' : 'border-gray-200 bg-gray-50 opacity-70'}`}>
                  <div className="flex items-center gap-3 w-full sm:w-1/3">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-gray-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                      checked={horariosSemana[idx]?.ativo || false}
                      onChange={(e) => setHorariosSemana(prev => ({
                        ...prev, 
                        [idx]: { ...prev[idx], ativo: e.target.checked }
                      }))}
                    />
                    <span className="font-bold text-gray-700 text-sm uppercase">{dia}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full sm:flex-1 sm:justify-end">
                    <input 
                      type="time" 
                      className={`w-full sm:w-auto border-2 border-gray-200 p-2 rounded-xl focus:border-sky-500 outline-none text-sm font-bold text-gray-700 ${!horariosSemana[idx]?.ativo ? 'opacity-50 cursor-not-allowed' : ''}`}
                      value={horariosSemana[idx]?.abertura || '08:00'}
                      disabled={!horariosSemana[idx]?.ativo}
                      onChange={(e) => setHorariosSemana(prev => ({
                        ...prev, 
                        [idx]: { ...prev[idx], abertura: e.target.value }
                      }))}
                    />
                    <span className="text-gray-400 font-bold uppercase text-xs">às</span>
                    <input 
                      type="time" 
                      className={`w-full sm:w-auto border-2 border-gray-200 p-2 rounded-xl focus:border-sky-500 outline-none text-sm font-bold text-gray-700 ${!horariosSemana[idx]?.ativo ? 'opacity-50 cursor-not-allowed' : ''}`}
                      value={horariosSemana[idx]?.fechamento || '19:00'}
                      disabled={!horariosSemana[idx]?.ativo}
                      onChange={(e) => setHorariosSemana(prev => ({
                        ...prev, 
                        [idx]: { ...prev[idx], fechamento: e.target.value }
                      }))}
                    />
                  </div>
                </div>
              ))}
              
              <button 
                onClick={salvarHorarios}
                disabled={loadingHorarios}
                className="w-full mt-6 bg-white text-gray-800 py-4 rounded-2xl font-black uppercase text-sm hover:bg-sky-500 hover:text-white transition-all shadow-xl shadow-blue-900/10 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loadingHorarios ? <Loader2 className="animate-spin text-gray-400" size={18} /> : 'Salvar Horários'}
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* ABA MEU PLANO */}
      {abaAtiva === 'plano' && role === 'PROPRIETARIO' && (
        <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm max-w-2xl mx-auto animate-fadeIn">
          <h2 className="text-xl font-black text-gray-800 uppercase mb-8 flex items-center gap-3">
            <ShieldCheck className="text-gray-500" size={24} /> Meu Plano Atual
          </h2>
          
          {loadingAssinatura ? (
            <div className="flex items-center justify-center py-12">
               <span className="animate-spin w-8 h-8 border-4 border-gray-200 border-t-blue-900 rounded-full"></span>
            </div>
          ) : erroAssinatura ? (
            <div className="bg-red-50 border border-red-100 text-red-600 p-6 rounded-2xl font-bold uppercase text-sm text-center flex flex-col items-center gap-2">
              <AlertCircle size={24} className="text-red-400" />
              {erroAssinatura}
            </div>
          ) : assinatura ? (
            <div className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Status da Conta</p>
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 ${
                        assinatura.status === 'TRIAL' ? 'bg-sky-50 text-sky-600' :
                        (assinatura.status === 'ATIVA' || assinatura.status === 'ATIVO') && assinatura.dias_restantes > 5 ? 'bg-emerald-100 text-emerald-700' :
                        (assinatura.status === 'ATIVA' || assinatura.status === 'ATIVO') && assinatura.dias_restantes <= 5 ? 'bg-orange-100 text-orange-700' :
                        'bg-sky-50 text-sky-600'
                    }`}>
                      {assinatura.status === 'TRIAL' ? 'TRIAL (TESTE)' : (assinatura.status === 'ATIVA' || assinatura.status === 'ATIVO') && assinatura.dias_restantes <= 5 ? '⚠️ VENCENDO' : assinatura.status === 'ATIVA' ? 'ATIVO' : assinatura.status}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Valor do Plano</p>
                    <p className="font-black text-gray-800 text-lg">{fmt(100)} <span className="text-xs font-bold text-gray-500 uppercase">/ mês</span></p>
                  </div>
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Vencimento</p>
                    <p className="font-bold text-gray-800 text-lg">
                      {new Date(assinatura.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Dias Restantes</p>
                    <p className={`font-black text-lg ${assinatura.dias_restantes < 0 ? 'text-sky-600' : 'text-gray-800'}`}>
                      {assinatura.dias_restantes < 0 ? 'VENCIDO' : `${assinatura.dias_restantes} DIAS`}
                    </p>
                  </div>
               </div>

               <button 
                 onClick={() => setModalPix(true)}
                 className="w-full mt-6 bg-white text-gray-800 py-4 rounded-2xl font-black uppercase text-sm hover:bg-sky-500 hover:text-white transition-all shadow-xl shadow-blue-900/10 flex items-center justify-center gap-2"
               >
                 <CreditCard size={18} /> Renovar Agora
               </button>
            </div>
          ) : null}
        </div>
      )}

      {/* MODAL PIX */}
      <Modal open={modalPix} onClose={() => setModalPix(false)} title="RENOVAR MEU PLANO">
        <div className="space-y-6">
           <div className="text-center p-6 bg-gray-50 rounded-2xl border border-gray-200">
             <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Assinatura Mensal</p>
             <p className="text-4xl font-black text-emerald-600">{fmt(100)}</p>
           </div>
           
           <div>
             <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Pague via PIX:</p>
             
             {pixCopiaCola && (
               <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border-2 border-gray-200 mb-4 shadow-sm animate-fadeIn">
                 <img 
                   src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCopiaCola)}`}
                   alt="QR Code PIX"
                   className="w-40 h-40 sm:w-48 sm:h-48 rounded-xl shadow-sm border border-gray-200"
                 />
                 <p className="text-[10px] font-black text-gray-500 uppercase mt-4 tracking-widest">Escaneie com o app do banco</p>
               </div>
             )}

             <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
               <div className="text-center sm:text-left overflow-hidden w-full">
                 <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{pixCopiaCola ? 'PIX Copia e Cola' : 'Chave PIX'}</p>
                 <p className="font-bold text-gray-800 text-sm tracking-wider truncate w-full" title={pixCopiaCola || chavePix}>
                   {pixCopiaCola || chavePix}
                 </p>
                 {nomePix && <p className="text-xs font-bold text-gray-500 uppercase mt-0.5">{nomePix}</p>}
               </div>
               <button 
                 onClick={copiarChave}
                 className="w-full sm:w-auto bg-sky-50 text-gray-600 px-5 py-3 rounded-xl text-xs font-black uppercase hover:bg-sky-100 transition-colors flex items-center justify-center gap-2 whitespace-nowrap flex-shrink-0"
               >
                 <Copy size={14} /> {copiado ? 'COPIADO!' : 'COPIAR CÓDIGO'}
               </button>
             </div>
           </div>

           <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3">
             <ShieldCheck size={20} className="text-emerald-500 flex-shrink-0 mt-0.5" />
             <p className="text-xs font-bold text-emerald-700 leading-relaxed uppercase">
               Após realizar o pagamento, seu acesso será renovado no sistema em até 1 hora. O vendedor responsável confirmará a transação.
             </p>
           </div>

           <div className="pt-4 border-t border-gray-200 flex flex-col items-center">
             <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Dúvidas? Fale com o suporte</p>
             <a 
               href={`https://wa.me/55${wpp?.replace(/\D/g, '')}`} 
               target="_blank" 
               rel="noreferrer"
               className="inline-flex items-center gap-2 bg-white text-gray-800 px-8 py-3 rounded-xl font-bold text-xs hover:bg-sky-500 hover:text-white transition-all shadow-md uppercase tracking-wider"
             >
               <MessageCircle size={16} /> Falar no WhatsApp
             </a>
           </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!confirmacao}
        title={confirmacao?.title || ''}
        message={confirmacao?.message || ''}
        confirmLabel={confirmacao?.confirmLabel || 'CONFIRMAR'}
        tone={confirmacao?.tone || 'danger'}
        onCancel={() => setConfirmacao(null)}
        onConfirm={confirmacao?.onConfirm || (() => setConfirmacao(null))}
      />
    </div>
  );
}
// Fim do componente
