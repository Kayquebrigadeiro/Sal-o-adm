import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtData = (d) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

const gerarHorarios = () => {
  const horarios = [];
  for (let h = 8; h <= 19; h++) {
    horarios.push(`${String(h).padStart(2, '0')}:00`);
    if (h !== 19) horarios.push(`${String(h).padStart(2, '0')}:30`);
  }
  return horarios;
};

export default function Agenda({ salaoId }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dataAtual, setDataAtual] = useState(new Date().toISOString().split('T')[0]);
  
  const [profissionais, setProfissionais] = useState([]);
  const [procedimentos, setProcedimentos] = useState([]);
  const [atendimentos, setAtendimentos] = useState([]);
  
  const [modalAberto, setModalAberto] = useState(false);
  const [modalCheckout, setModalCheckout] = useState(false);
  const [atendimentoSelecionado, setAtendimentoSelecionado] = useState(null);
  
  const [form, setForm] = useState({
    horario: '',
    profissional_id: '',
    procedimento_id: '',
    comprimento: 'P',
    cliente: '',
    valor_cobrado: '',
    obs: ''
  });

  const [checkoutForm, setCheckoutForm] = useState({ valor_pago: '' });

  const horarios = gerarHorarios();

  useEffect(() => {
    carregarDados();
  }, [dataAtual, salaoId]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [profsRes, procsRes, atendsRes] = await Promise.all([
        supabase.from('profissionais').select('*').eq('salao_id', salaoId).eq('ativo', true),
        supabase.from('procedimentos').select('*').eq('salao_id', salaoId).eq('ativo', true),
        supabase.from('atendimentos')
          .select('*, profissionais(nome), procedimentos(nome, requer_comprimento)')
          .eq('salao_id', salaoId)
          .eq('data', dataAtual)
          .order('horario')
      ]);

      setProfissionais(profsRes.data || []);
      setProcedimentos(procsRes.data || []);
      setAtendimentos(atendsRes.data || []);
    } catch (error) {
      showToast('Erro ao carregar agenda', 'error');
    } finally {
      setLoading(false);
    }
  };

  const mudarDia = (dias) => {
    const nova = new Date(dataAtual);
    nova.setDate(nova.getDate() + dias);
    setDataAtual(nova.toISOString().split('T')[0]);
  };

  const irParaHoje = () => {
    setDataAtual(new Date().toISOString().split('T')[0]);
  };

  const abrirModalNovo = (horario, profissionalId) => {
    const proc = procedimentos[0];
    setForm({
      horario,
      profissional_id: profissionalId,
      procedimento_id: proc?.id || '',
      comprimento: 'P',
      cliente: '',
      valor_cobrado: proc?.preco_p || '',
      obs: ''
    });
    setModalAberto(true);
  };

  const handleProcedimentoChange = (procId) => {
    const proc = procedimentos.find(p => p.id === procId);
    setForm({
      ...form,
      procedimento_id: procId,
      comprimento: proc?.requer_comprimento ? 'P' : null,
      valor_cobrado: proc?.preco_p || ''
    });
  };

  const handleComprimentoChange = (comp) => {
    const proc = procedimentos.find(p => p.id === form.procedimento_id);
    let valor = proc?.preco_p || 0;
    if (comp === 'M') valor = proc?.preco_m || 0;
    if (comp === 'G') valor = proc?.preco_g || 0;
    setForm({ ...form, comprimento: comp, valor_cobrado: valor });
  };

  const salvarAgendamento = async () => {
    if (!form.cliente.trim()) {
      showToast('Informe o nome do cliente', 'error');
      return;
    }

    try {
      const proc = procedimentos.find(p => p.id === form.procedimento_id);
      
      await supabase.from('atendimentos').insert({
        salao_id: salaoId,
        data: dataAtual,
        horario: form.horario + ':00',
        profissional_id: form.profissional_id,
        procedimento_id: form.procedimento_id,
        comprimento: proc?.requer_comprimento ? form.comprimento : null,
        cliente: form.cliente.trim(),
        valor_cobrado: Number(form.valor_cobrado),
        valor_pago: 0,
        obs: form.obs,
        status: 'AGENDADO'
      });

      showToast('Agendamento criado', 'success');
      setModalAberto(false);
      carregarDados();
    } catch (error) {
      showToast('Erro ao salvar: ' + error.message, 'error');
    }
  };

  const abrirCheckout = (atendimento) => {
    setAtendimentoSelecionado(atendimento);
    setCheckoutForm({ valor_pago: atendimento.valor_cobrado });
    setModalCheckout(true);
  };

  const finalizarAtendimento = async () => {
    try {
      await supabase.from('atendimentos').update({
        status: 'EXECUTADO',
        valor_pago: Number(checkoutForm.valor_pago)
      }).eq('id', atendimentoSelecionado.id);

      showToast('Atendimento finalizado', 'success');
      setModalCheckout(false);
      carregarDados();
    } catch (error) {
      showToast('Erro ao finalizar', 'error');
    }
  };

  const cancelarAtendimento = async () => {
    if (!confirm('Cancelar este agendamento?')) return;
    
    try {
      await supabase.from('atendimentos').update({ status: 'CANCELADO' }).eq('id', atendimentoSelecionado.id);
      showToast('Agendamento cancelado', 'success');
      setModalCheckout(false);
      carregarDados();
    } catch (error) {
      showToast('Erro ao cancelar', 'error');
    }
  };

  const getAtendimento = (horario, profissionalId) => {
    return atendimentos.find(a => 
      a.profissional_id === profissionalId && 
      a.horario.substring(0, 5) === horario &&
      a.status !== 'CANCELADO'
    );
  };

  const totalAtendimentos = atendimentos.filter(a => a.status !== 'CANCELADO').length;
  const procSelecionado = procedimentos.find(p => p.id === form.procedimento_id);

  if (loading) return <div className="p-10 text-center">Carregando agenda...</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <PageHeader 
        title="Agenda" 
        subtitle={`${totalAtendimentos} agendamento(s) hoje`}
        action={
          <div className="flex items-center gap-3">
            <button onClick={() => mudarDia(-1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronLeft size={20} />
            </button>
            <div className="text-center min-w-[200px]">
              <p className="text-sm font-semibold text-slate-900 capitalize">{fmtData(dataAtual)}</p>
            </div>
            <button onClick={() => mudarDia(1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronRight size={20} />
            </button>
            <button onClick={irParaHoje} className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm transition-colors">
              <Calendar size={16} />
              Hoje
            </button>
          </div>
        }
      />

      {/* Grade de Horários */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-4 py-3 text-center w-24 border-r border-slate-700">Horário</th>
                {profissionais.map(prof => (
                  <th key={prof.id} className="px-4 py-3 text-center min-w-[200px] border-r border-slate-700">
                    {prof.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {horarios.map(horario => (
                <tr key={horario} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-center font-medium text-slate-600 bg-slate-50 border-r border-slate-200">
                    {horario}
                  </td>
                  {profissionais.map(prof => {
                    const atend = getAtendimento(horario, prof.id);
                    return (
                      <td key={`${horario}-${prof.id}`} className="p-2 border-r border-slate-100">
                        {atend ? (
                          <div
                            onClick={() => abrirCheckout(atend)}
                            className={`p-3 rounded-lg cursor-pointer transition-all border-l-4 ${
                              atend.status === 'EXECUTADO'
                                ? 'bg-emerald-50 border-emerald-400 hover:bg-emerald-100'
                                : 'bg-blue-50 border-blue-400 hover:bg-blue-100'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-semibold text-slate-900 text-sm">{atend.cliente}</p>
                              {atend.status === 'EXECUTADO' && (
                                <span className="text-xs bg-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full">✓</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 truncate">{atend.procedimentos?.nome}</p>
                            <p className="text-xs font-medium text-slate-700 mt-1">{fmt(atend.valor_cobrado)}</p>
                            {atend.valor_pendente > 0 && (
                              <p className="text-xs text-amber-600 mt-1">Pendente: {fmt(atend.valor_pendente)}</p>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => abrirModalNovo(horario, prof.id)}
                            className="w-full h-full min-h-[80px] border-2 border-dashed border-transparent hover:border-slate-300 hover:bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
                          >
                            <Plus size={20} />
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo Agendamento */}
      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title="Novo Agendamento">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Horário</label>
              <input
                type="text"
                value={form.horario}
                disabled
                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 text-slate-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Profissional</label>
              <input
                type="text"
                value={profissionais.find(p => p.id === form.profissional_id)?.nome || ''}
                disabled
                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 text-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cliente *</label>
            <input
              type="text"
              value={form.cliente}
              onChange={e => setForm({ ...form, cliente: e.target.value })}
              placeholder="Nome do cliente"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Procedimento *</label>
            <select
              value={form.procedimento_id}
              onChange={e => handleProcedimentoChange(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {procedimentos.map(p => (
                <option key={p.id} value={p.id}>{p.nome} - {p.categoria}</option>
              ))}
            </select>
          </div>

          {procSelecionado?.requer_comprimento && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tamanho do Cabelo *</label>
              <div className="grid grid-cols-3 gap-2">
                {['P', 'M', 'G'].map(comp => (
                  <button
                    key={comp}
                    onClick={() => handleComprimentoChange(comp)}
                    className={`py-2 px-4 rounded-lg border-2 transition-all ${
                      form.comprimento === comp
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold'
                        : 'border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {comp === 'P' ? 'Curto' : comp === 'M' ? 'Médio' : 'Longo'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Valor a Cobrar (R$) *</label>
            <input
              type="number"
              step="0.01"
              value={form.valor_cobrado}
              onChange={e => setForm({ ...form, valor_cobrado: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
            <textarea
              value={form.obs}
              onChange={e => setForm({ ...form, obs: e.target.value })}
              placeholder="Observações adicionais..."
              rows="2"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setModalAberto(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={salvarAgendamento}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Confirmar Agendamento
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Checkout */}
      <Modal open={modalCheckout} onClose={() => setModalCheckout(false)} title="Finalizar Atendimento">
        {atendimentoSelecionado && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Cliente:</span>
                <span className="font-medium">{atendimentoSelecionado.cliente}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Procedimento:</span>
                <span className="font-medium">{atendimentoSelecionado.procedimentos?.nome}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Profissional:</span>
                <span className="font-medium">{atendimentoSelecionado.profissionais?.nome}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2 mt-2">
                <span className="text-slate-600">Valor a Cobrar:</span>
                <span className="font-bold text-emerald-600">{fmt(atendimentoSelecionado.valor_cobrado)}</span>
              </div>
            </div>

            {atendimentoSelecionado.status === 'EXECUTADO' ? (
              <div className="text-center p-4 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
                ✓ Atendimento já finalizado
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valor Pago Agora (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={checkoutForm.valor_pago}
                    onChange={e => setCheckoutForm({ valor_pago: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {Number(checkoutForm.valor_pago) < atendimentoSelecionado.valor_cobrado && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Restará pendente: {fmt(atendimentoSelecionado.valor_cobrado - Number(checkoutForm.valor_pago))}
                    </p>
                  )}
                </div>

                <button
                  onClick={finalizarAtendimento}
                  className="w-full py-3 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600 transition-colors"
                >
                  Confirmar e Finalizar
                </button>
              </>
            )}

            <div className="flex justify-between pt-4 border-t">
              <button
                onClick={cancelarAtendimento}
                disabled={atendimentoSelecionado.status === 'EXECUTADO'}
                className="text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                Cancelar Agendamento
              </button>
              <button
                onClick={() => setModalCheckout(false)}
                className="text-slate-600 hover:bg-slate-100 px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
