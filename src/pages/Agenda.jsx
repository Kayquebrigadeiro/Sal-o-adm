import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Agenda = () => {
  const [dataAtual, setDataAtual] = useState(new Date());
  const [profissionais, setProfissionais] = useState([]);
  const [procedimentos, setProcedimentos] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal de Novo Agendamento
  const [modalAberto, setModalAberto] = useState(false);
  const [slotSelecionado, setSlotSelecionado] = useState({ horario: '', profissional_id: '', profissional_nome: '' });
  const [novoAgendamento, setNovoAgendamento] = useState({ cliente: '', procedimento_id: '', comprimento: 'M', obs: '' });

  // NOVO: Modal de Checkout (Finalizar Atendimento)
  const [modalCheckoutAberto, setModalCheckoutAberto] = useState(false);
  const [atendimentoSelecionado, setAtendimentoSelecionado] = useState(null);
  const [valorRecebido, setValorRecebido] = useState('');

  const gerarHorarios = () => {
    const horarios = [];
    for (let h = 8; h <= 18; h++) {
      horarios.push(`${h}:00`);
      if (h !== 18) horarios.push(`${h}:30`);
    }
    return horarios;
  };
  const horarios = gerarHorarios();

  useEffect(() => {
    fetchDadosDoDia();
  }, [dataAtual]);

  const fetchDadosDoDia = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: perfil } = await supabase.from('perfis_acesso').select('salao_id').eq('auth_user_id', user?.id).single();
      const salaoId = perfil?.salao_id;

      if (!salaoId) return;

      const { data: profs } = await supabase.from('profissionais').select('*').eq('salao_id', salaoId).eq('ativo', true);
      setProfissionais(profs || []);

      const { data: procs } = await supabase.from('procedimentos').select('*').eq('salao_id', salaoId).eq('ativo', true);
      setProcedimentos(procs || []);

      const dataFormatada = dataAtual.toISOString().split('T')[0];
      const { data: agends } = await supabase
        .from('atendimentos')
        .select('*, profissionais(nome), procedimentos(nome, requer_comprimento)')
        .eq('salao_id', salaoId)
        .eq('data', dataFormatada)
        .neq('status', 'CANCELADO');
      
      setAgendamentos(agends || []);
    } catch (error) {
      console.error("Erro ao carregar agenda:", error);
    } finally {
      setLoading(false);
    }
  };

  const mudarDia = (dias) => {
    const novaData = new Date(dataAtual);
    novaData.setDate(novaData.getDate() + dias);
    setDataAtual(novaData);
  };

  // --- FUNÇÕES DE NOVO AGENDAMENTO ---
  const abrirModalNovo = (horario, prof) => {
    setSlotSelecionado({ horario, profissional_id: prof.id, profissional_nome: prof.nome });
    setNovoAgendamento({ cliente: '', procedimento_id: procedimentos[0]?.id || '', comprimento: 'M', obs: '' });
    setModalAberto(true);
  };

  const salvarAgendamento = async (e) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: perfil } = await supabase.from('perfis_acesso').select('salao_id').eq('auth_user_id', user.id).single();
      const dataFormatada = dataAtual.toISOString().split('T')[0];

      const { error } = await supabase.from('atendimentos').insert([{
        salao_id: perfil.salao_id,
        data: dataFormatada,
        horario: slotSelecionado.horario + ':00',
        profissional_id: slotSelecionado.profissional_id,
        procedimento_id: novoAgendamento.procedimento_id,
        comprimento: novoAgendamento.comprimento,
        cliente: novoAgendamento.cliente,
        obs: novoAgendamento.obs
      }]);

      if (error) throw error;
      setModalAberto(false);
      fetchDadosDoDia();
    } catch (error) {
      alert("Erro ao salvar: " + error.message);
    }
  };

  // --- FUNÇÕES DE CHECKOUT / FINALIZAR ---
  const abrirModalCheckout = (agendamento) => {
    setAtendimentoSelecionado(agendamento);
    setValorRecebido(agendamento.valor_pago || '');
    setModalCheckoutAberto(true);
  };

  const finalizarAtendimento = async () => {
    // ✅ Validação robusta: não aceita vazio nem número negativo
    if (valorRecebido === '' || Number(valorRecebido) < 0) {
      return alert("Insira um valor pago válido.");
    }

    const { error } = await supabase
      .from('atendimentos')
      .update({ 
        status: 'EXECUTADO', 
        valor_pago: Number(valorRecebido) 
      })
      .eq('id', atendimentoSelecionado.id);

    if (error) alert("Erro ao finalizar: " + error.message);
    else {
      setModalCheckoutAberto(false);
      setValorRecebido('');
      fetchDadosDoDia();
    }
  };

  const cancelarAtendimento = async () => {
    if(!window.confirm("Tem certeza que deseja cancelar este agendamento?")) return;
    
    const { error } = await supabase
      .from('atendimentos')
      .update({ status: 'CANCELADO' })
      .eq('id', atendimentoSelecionado.id);

    if (error) alert("Erro ao cancelar: " + error.message);
    else {
      setModalCheckoutAberto(false);
      fetchDadosDoDia();
    }
  };

  const getAgendamento = (horario, profissionalId) => {
    return agendamentos.find(a => 
      a.profissional_id === profissionalId && 
      a.horario.substring(0, 5) === horario
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Agenda da Equipe</h1>
          <p className="text-gray-500">Organize os horários de forma fácil.</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => mudarDia(-1)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg">&lt; Anterior</button>
          <span className="font-semibold text-lg min-w-[150px] text-center">
            {dataAtual.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'long' })}
          </span>
          <button onClick={() => mudarDia(1)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg">Próximo &gt;</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        {loading ? (
          <div className="p-10 text-center text-gray-500">Carregando horários...</div>
        ) : (
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="p-3 border-b border-r border-slate-700 w-24 text-center">Horário</th>
                {profissionais.map(prof => (
                  <th key={prof.id} className="p-3 border-b border-slate-700 text-center min-w-[200px]">
                    {prof.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {horarios.map(horario => (
                <tr key={horario} className="hover:bg-gray-50 group">
                  <td className="p-3 border-b border-r border-gray-200 text-center font-medium text-gray-600 bg-gray-50">
                    {horario}
                  </td>
                  {profissionais.map(prof => {
                    const agendamento = getAgendamento(horario, prof.id);
                    return (
                      <td key={`${horario}-${prof.id}`} className="p-2 border-b border-r border-gray-200">
                        {agendamento ? (
                          // Card de Horário Ocupado (Agora é clicável para Checkout)
                          <div 
                            onClick={() => abrirModalCheckout(agendamento)}
                            className={`p-2 border rounded-lg shadow-sm cursor-pointer transition-colors ${
                              agendamento.status === 'EXECUTADO' ? 'bg-emerald-50 border-emerald-200' : 'bg-white'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <p className="font-bold">
                                {agendamento.cliente}
                              </p>
                              {agendamento.status === 'EXECUTADO' && <span className="text-xs bg-emerald-200 text-emerald-700 px-1 rounded">✓</span>}
                            </div>
                            <p className="text-xs truncate">
                              {agendamento.procedimentos?.nome}
                            </p>
                          </div>
                        ) : (
                          <div 
                            onClick={() => abrirModalNovo(horario, prof)}
                            className="h-full min-h-[45px] w-full border-2 border-dashed border-transparent group-hover:border-gray-300 rounded-lg cursor-pointer flex items-center justify-center text-gray-400 hover:text-slate-900 hover:bg-gray-100 transition-all"
                          >
                            + Marcar
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal NOVO AGENDAMENTO */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-1">Novo Atendimento</h3>
            <p className="text-sm text-gray-500 mb-4">{slotSelecionado.horario} com {slotSelecionado.profissional_nome}</p>
            
            <form onSubmit={salvarAgendamento} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome da Cliente</label>
                <input required type="text" value={novoAgendamento.cliente} onChange={e => setNovoAgendamento({...novoAgendamento, cliente: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-slate-900" placeholder="Ex: Maria" />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Procedimento</label>
                <select value={novoAgendamento.procedimento_id} onChange={e => setNovoAgendamento({...novoAgendamento, procedimento_id: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-slate-900">
                  {procedimentos.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tamanho do Cabelo</label>
                <select value={novoAgendamento.comprimento} onChange={e => setNovoAgendamento({...novoAgendamento, comprimento: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-slate-900">
                  <option value="P">Pequeno (P)</option>
                  <option value="M">Médio (M)</option>
                  <option value="G">Grande (G)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setModalAberto(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-md">Confirmar Agendamento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal CHECKOUT (FINALIZAR ATENDIMENTO) */}
      {modalCheckoutAberto && atendimentoSelecionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold mb-1 text-slate-800">Finalizar Atendimento</h3>
            <p className="text-sm text-gray-500 mb-6">
              {atendimentoSelecionado.cliente} • {atendimentoSelecionado.horario.substring(0,5)}
            </p>

            <div className="space-y-3 mb-6 bg-gray-50 p-4 rounded-xl border">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Serviço:</span>
                <span className="font-medium">{atendimentoSelecionado.procedimentos?.nome}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Profissional:</span>
                <span className="font-medium">{atendimentoSelecionado.profissionais?.nome}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-emerald-600 border-t pt-2 mt-2">
                <span>Valor Cobrado:</span>
                <span>R$ {atendimentoSelecionado.valor_cobrado}</span>
              </div>
            </div>

            {atendimentoSelecionado.status === 'EXECUTADO' ? (
              <div className="text-center p-3 bg-emerald-50 text-emerald-700 rounded-lg mb-6 border border-emerald-200">
                ✔️ Este atendimento já foi finalizado.
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valor Pago Hoje (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={valorRecebido}
                    onChange={e => setValorRecebido(e.target.value)}
                    placeholder={atendimentoSelecionado.valor_cobrado}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                  {Number(valorRecebido) < atendimentoSelecionado.valor_cobrado && (
                    <p className="text-xs text-amber-600 mt-1">⚠️ Restará um saldo pendente de R$ {(atendimentoSelecionado.valor_cobrado - Number(valorRecebido)).toFixed(2)}</p>
                  )}
                </div>

                <button 
                  onClick={finalizarAtendimento}
                  className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors shadow-md mb-3"
                >
                  Confirmar e Finalizar
                </button>
              </>
            )}

            <div className="flex justify-between mt-4 border-t pt-4">
              <button 
                onClick={cancelarAtendimento}
                className="text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg text-sm transition-colors"
                disabled={atendimentoSelecionado.status === 'EXECUTADO'}
              >
                Cancelar Agendamento
              </button>
              <button 
                onClick={() => setModalCheckoutAberto(false)}
                className="text-slate-600 hover:bg-slate-100 px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Agenda;
