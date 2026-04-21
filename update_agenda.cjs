const fs = require('fs');
const file = 'c:\\Ptojeto-jaco\\Salao-secreto\\src\\pages\\Agenda.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "import { Clock, User, Scissors, DollarSign, X, CheckCircle2, AlertCircle, AlertTriangle, UserPlus, List, ChevronLeft, ChevronRight, Loader2, Sparkles, Search, Phone, Plus, Eye, EyeOff } from 'lucide-react';",
  "import { Clock, User, Scissors, DollarSign, X, CheckCircle2, AlertCircle, AlertTriangle, UserPlus, List, ChevronLeft, ChevronRight, Loader2, Sparkles, Search, Phone, Plus, Eye, EyeOff, Trash2 } from 'lucide-react';"
);

content = content.replace(
  "onClick={() => !agend && abrirAgendamento(hora, prof.id)}",
  "onClick={() => !agend ? abrirAgendamento(hora, prof.id) : abrirDetalhes(agend)}"
);

content = content.replace(
  "// --- Encontrar agendamento na grade ---",
  `// --- Modal Detalhes/Cancelamento ---
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState(null);
  const [cancelando, setCancelando] = useState(false);

  const abrirDetalhes = (agend) => {
    setAgendamentoSelecionado(agend);
    setModalDetalhesAberto(true);
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
      showToast(\`Erro: \${err.message}\`, 'error');
    } finally {
      setCancelando(false);
    }
  };

  // --- Encontrar agendamento na grade ---`
);

content = content.replace(
  "{/* --- PAINEL LATERAL (MODAL) --- */}",
  `{/* --- MODAL DETALHES DO ATENDIMENTO --- */}
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
                <p className="font-medium text-slate-700">{agendamentoSelecionado.procedimentos?.nome} {agendamentoSelecionado.comprimento ? \`(\${agendamentoSelecionado.comprimento})\` : ''}</p>
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

      {/* --- PAINEL LATERAL (MODAL) --- */}`
);

fs.writeFileSync(file, content);
console.log('Done!');
