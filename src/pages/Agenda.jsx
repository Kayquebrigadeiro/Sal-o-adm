import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { 
  ChevronLeft, ChevronRight, Plus, Eye, EyeOff, 
  UserPlus, AlertCircle, Clock, CheckCircle2 
} from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const HORARIOS = [];
for (let h = 8; h <= 20; h++) {
  HORARIOS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 20) HORARIOS.push(`${String(h).padStart(2, '0')}:30`);
}

export default function Agenda({ salaoId }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dataAtual, setDataAtual] = useState(new Date().toISOString().split('T')[0]);
  
  // Dados do BD
  const [config, setConfig] = useState(null);
  const [profissionais, setProfissionais] = useState([]);
  const [procedimentos, setProcedimentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [atendimentos, setAtendimentos] = useState([]);
  
  // Estados dos Modais
  const [modalAberto, setModalAberto] = useState(false);
  const [mostrarAlerta, setMostrarAlerta] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [atendimentoSelecionado, setAtendimentoSelecionado] = useState(null);
  
  const [form, setForm] = useState({
    cliente_id: '',
    profissional_id: '',
    procedimento_id: '',
    comprimento: 'M',
    data: dataAtual,
    horario: '09:00',
    valor_cobrado: ''
  });

  const [modalCliente, setModalCliente] = useState(false);
  const [formCliente, setFormCliente] = useState({ nome: '', telefone: '' });

  useEffect(() => {
    if (salaoId) carregarDados();
  }, [salaoId, dataAtual]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resConfig, resProf, resProc, resCli, resAtend] = await Promise.all([
        supabase.from('configuracoes').select('*').eq('salao_id', salaoId).single(),
        supabase.from('profissionais').select('*').eq('salao_id', salaoId).eq('ativo', true),
        supabase.from('procedimentos').select('*').eq('salao_id', salaoId).eq('ativo', true),
        supabase.from('clientes').select('*').eq('salao_id', salaoId).order('nome'),
        supabase.from('atendimentos').select('*, profissionais(nome), procedimentos(nome)')
          .eq('salao_id', salaoId)
          .eq('data', dataAtual)
          .neq('status', 'CANCELADO')
      ]);

      setConfig(resConfig.data);
      setProfissionais(resProf.data || []);
      setProcedimentos(resProc.data || []);
      setClientes(resCli.data || []);
      setAtendimentos(resAtend.data || []);
    } catch (err) {
      showToast('Erro ao carregar dados', 'error');
    }
    setLoading(false);
  };

  const calculoFinanceiro = useMemo(() => {
    if (!config || !form.procedimento_id) return null;
    const proc = procedimentos.find(p => p.id === form.procedimento_id);
    if (!proc) return null;

    const custoMaterial = proc[`custo_material_${form.comprimento.toLowerCase()}`] || proc.custo_variavel || 0;
    const taxaTotalPct = (config.taxa_maquininha_pct || 0) + (proc.porcentagem_profissional || 0) + (config.margem_lucro_desejada_pct || 20);
    
    let precoRecomendado = (config.custo_fixo_por_atendimento + custoMaterial) / (1 - (taxaTotalPct / 100));
    precoRecomendado = Math.ceil(precoRecomendado / 5) * 5; 

    const valorCobrado = Number(form.valor_cobrado || 0);
    const perda = precoRecomendado - valorCobrado;
    return { recomendado: precoRecomendado, perda: perda > 0 ? perda : 0, temPerda: valorCobrado > 0 && perda > 0 };
  }, [form.procedimento_id, form.comprimento, form.valor_cobrado, procedimentos, config]);

  const abrirNovoAgendamento = (profId = '', hora = '09:00') => {
    setForm({
      cliente_id: '',
      profissional_id: profId,
      procedimento_id: '',
      comprimento: 'M',
      data: dataAtual,
      horario: hora,
      valor_cobrado: ''
    });
    setMostrarAlerta(false);
    setModalAberto(true);
  };

  const salvarAgendamento = async () => {
    if(!form.cliente_id || !form.procedimento_id || !form.profissional_id) return showToast('Campos obrigatórios!', 'error');
    const cli = clientes.find(c => c.id === form.cliente_id);
    
    const { error } = await supabase.from('atendimentos').insert([{
      salao_id: salaoId,
      data: form.data,
      horario: form.horario,
      profissional_id: form.profissional_id,
      procedimento_id: form.procedimento_id,
      comprimento: form.comprimento,
      cliente: cli.nome,
      valor_cobrado: form.valor_cobrado || calculoFinanceiro?.recomendado || 0,
      status: 'AGENDADO'
    }]);

    if (error) showToast('Erro ao agendar', 'error');
    else {
      showToast('Agendado!', 'success');
      setModalAberto(false);
      carregarDados();
    }
  };

  const mudarData = (dias) => {
    const d = new Date(dataAtual + 'T12:00:00');
    d.setDate(d.getDate() + dias);
    setDataAtual(d.toISOString().split('T')[0]);
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">
      {/* Header com Navegação de Data */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Clock className="text-emerald-600" /> Agenda do Dia
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={() => mudarData(-1)} className="p-1 hover:bg-slate-200 rounded"><ChevronLeft size={20}/></button>
            <span className="font-semibold text-slate-600">
              {new Date(dataAtual + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </span>
            <button onClick={() => mudarData(1)} className="p-1 hover:bg-slate-200 rounded"><ChevronRight size={20}/></button>
          </div>
        </div>
        <button 
          onClick={() => abrirNovoAgendamento()}
          className="w-full sm:w-auto bg-slate-900 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-slate-200 active:scale-95 transition-all"
        >
          <Plus size={20} /> Novo Agendamento
        </button>
      </div>

      {/* GRADE VISUAL DA AGENDA */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header da Grade (Profissionais) */}
            <div className="flex border-b bg-slate-50">
              <div className="w-20 border-r py-3"></div>
              {profissionais.map(prof => (
                <div key={prof.id} className="flex-1 text-center py-3 border-r font-bold text-slate-700 uppercase text-xs tracking-wider">
                  {prof.nome}
                </div>
              ))}
            </div>

            {/* Linhas de Horário */}
            <div className="relative">
              {HORARIOS.map(hora => (
                <div key={hora} className="flex border-b group h-14">
                  {/* Hora na lateral */}
                  <div className="w-20 border-r flex items-center justify-center text-[11px] font-bold text-slate-400 bg-slate-50/50">
                    {hora}
                  </div>
                  
                  {/* Células por Profissional */}
                  {profissionais.map(prof => {
                    const agendamento = atendimentos.find(a => 
                      a.profissional_id === prof.id && 
                      a.horario.slice(0, 5) === hora
                    );

                    return (
                      <div 
                        key={prof.id} 
                        className="flex-1 border-r relative group-hover:bg-slate-50/30 transition-colors"
                        onClick={() => !agendamento && abrirNovoAgendamento(prof.id, hora)}
                      >
                        {!agendamento && (
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none">
                            <Plus size={16} className="text-slate-300" />
                          </div>
                        )}

                        {agendamento && (
                          <div 
                            onClick={(e) => { e.stopPropagation(); setAtendimentoSelecionado(agendamento); setModalDetalhes(true); }}
                            className={`absolute inset-1 p-2 rounded-lg border text-left cursor-pointer transition-all hover:scale-[1.02] shadow-sm z-10
                              ${agendamento.status === 'EXECUTADO' 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                : 'bg-blue-50 border-blue-200 text-blue-800'}`}
                          >
                            <p className="text-[10px] font-bold uppercase truncate">{agendamento.procedimentos?.nome}</p>
                            <p className="text-[11px] font-medium truncate">{agendamento.cliente}</p>
                            {agendamento.status === 'EXECUTADO' && <CheckCircle2 size={12} className="absolute bottom-1 right-1 text-emerald-500" />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE NOVO AGENDAMENTO (Cálculo incluído) */}
      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title="Agendar Horário">
        <div className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-lg flex items-center gap-3 mb-2 border">
             <Clock size={18} className="text-slate-400" />
             <span className="text-sm font-bold text-slate-600">{horaFormatada(form.horario)}</span>
             <span className="text-slate-300">|</span>
             <span className="text-sm font-medium text-slate-500">{new Date(form.data + 'T12:00:00').toLocaleDateString()}</span>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="text-sm font-medium">Cliente</label>
              <button onClick={() => setModalCliente(true)} className="text-xs text-emerald-600 font-bold">+ Nova Cliente</button>
            </div>
            <select className="w-full border p-2.5 rounded-xl bg-white" value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })}>
              <option value="">Selecione...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome} {c.telefone ? `(${c.telefone})` : ''}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Profissional</label>
              <select className="w-full border p-2.5 rounded-xl" value={form.profissional_id} onChange={e => setForm({ ...form, profissional_id: e.target.value })}>
                {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Procedimento</label>
              <select className="w-full border p-2.5 rounded-xl" value={form.procedimento_id} onChange={e => setForm({ ...form, procedimento_id: e.target.value })}>
                <option value="">Selecione...</option>
                {procedimentos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Tamanho</label>
              <select className="w-full border p-2.5 rounded-xl" value={form.comprimento} onChange={e => setForm({ ...form, comprimento: e.target.value })}>
                <option value="P">P</option><option value="M">M</option><option value="G">G</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium mb-1 block">Valor a Cobrar (R$)</label>
              <input type="number" className="w-full border p-2.5 rounded-xl font-bold text-lg" placeholder={calculoFinanceiro?.recomendado || "0.00"} value={form.valor_cobrado} onChange={e => setForm({ ...form, valor_cobrado: e.target.value })} />
            </div>
          </div>

          {calculoFinanceiro?.temPerda && (
            <div className={`p-3 rounded-xl border transition-all cursor-pointer ${mostrarAlerta ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`} onClick={() => setMostrarAlerta(true)}>
              {!mostrarAlerta ? (
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-tight">
                  <span>Análise de Lucro Disponível</span><Eye size={14} />
                </div>
              ) : (
                <div className="animate-fadeIn">
                  <div className="flex items-center gap-2 text-red-700 font-bold text-sm mb-1"><AlertCircle size={16} /> Alerta de Perda</div>
                  <p className="text-xs text-red-800">
                    O valor ideal é <strong>{fmt(calculoFinanceiro.recomendado)}</strong>. 
                    Neste preço, você deixa de ganhar <strong>{fmt(calculoFinanceiro.perda)}</strong>.
                  </p>
                </div>
              )}
            </div>
          )}

          <button onClick={salvarAgendamento} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all mt-4">Confirmar Agendamento</button>
        </div>
      </Modal>

      {/* MODAL DETALHES DO AGENDAMENTO */}
      <Modal open={modalDetalhes} onClose={() => setModalDetalhes(false)} title="Detalhes do Atendimento">
        {atendimentoSelecionado && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border">
              <p className="text-xs font-bold text-slate-400 uppercase">Cliente</p>
              <p className="text-xl font-bold text-slate-800">{atendimentoSelecionado.cliente}</p>
              <div className="flex gap-4 mt-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Procedimento</p>
                  <p className="font-semibold text-slate-700">{atendimentoSelecionado.procedimentos?.nome} ({atendimentoSelecionado.comprimento})</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Valor</p>
                  <p className="font-bold text-emerald-600">{fmt(atendimentoSelecionado.valor_cobrado)}</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
               <button className="py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50">Editar</button>
               <button className="py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700">Finalizar (Pago)</button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}

function horaFormatada(h) {
  return h?.slice(0, 5) || '00:00';
}