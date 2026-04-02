import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

// ── Helpers ────────────────────────────────────────────────────────────────

const HORARIOS = [
  '08:00','08:30','09:00','09:30','10:00','10:30',
  '11:00','11:30','12:00','12:30','13:00','13:30',
  '14:00','14:30','15:00','15:30','16:00','16:30',
  '17:00','17:30','18:00','18:30','19:00',
];

const DIAS_PT = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const MESES_PT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

function formatarData(date) {
  const d = DIAS_PT[date.getDay()];
  const dia = date.getDate();
  const mes = MESES_PT[date.getMonth()];
  const ano = date.getFullYear();
  return `${d}, ${dia} ${mes} ${ano}`;
}

function toISO(date) {
  // Retorna YYYY-MM-DD sem conversão de fuso
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDias(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// Cores por status do agendamento
function classeEvento(atendimento) {
  if (atendimento.status === 'CANCELADO')
    return 'bg-gray-100 border-l-2 border-gray-400 text-gray-500';
  if (atendimento.pago)
    return 'bg-green-50 border-l-2 border-green-500 text-green-900';
  if (atendimento.executado)
    return 'bg-yellow-50 border-l-2 border-yellow-500 text-yellow-900';
  return 'bg-blue-50 border-l-2 border-blue-500 text-blue-900';
}

// ── Componente principal ───────────────────────────────────────────────────

export default function Agenda({ sessao }) {
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [profissionais, setProfissionais]     = useState([]);
  const [procedimentos, setProcedimentos]     = useState([]);
  const [atendimentos, setAtendimentos]       = useState([]);
  const [loading, setLoading]                 = useState(true);

  // Modal novo agendamento
  const [modalAberto, setModalAberto]         = useState(false);
  const [slotSelecionado, setSlotSelecionado] = useState(null);

  // Modal detalhes / ações
  const [detalheAberto, setDetalheAberto]     = useState(false);
  const [atendSelecionado, setAtendSelecionado] = useState(null);

  // Formulário
  const [cliente, setCliente]                 = useState('');
  const [procedimentoId, setProcedimentoId]   = useState('');
  const [comprimento, setComprimento]         = useState('');
  const [valorCobrado, setValorCobrado]       = useState('');
  const [salvando, setSalvando]               = useState(false);

  // ── Carregamento de dados ────────────────────────────────────────────────

  const carregarEstaticos = useCallback(async () => {
    const [{ data: profs }, { data: procs }] = await Promise.all([
      supabase.from('profissionais').select('*').eq('ativo', true).order('nome'),
      supabase.from('procedimentos').select('*').eq('ativo', true).order('nome'),
    ]);
    if (profs) setProfissionais(profs);
    if (procs) setProcedimentos(procs);
  }, []);

  const carregarAtendimentos = useCallback(async (data) => {
    setLoading(true);
    const { data: aten } = await supabase
      .from('atendimentos')
      .select(`*, procedimentos(nome, requer_comprimento), profissionais(nome)`)
      .eq('data', toISO(data))
      .order('horario');
    if (aten) setAtendimentos(aten);
    setLoading(false);
  }, []);

  useEffect(() => { carregarEstaticos(); }, [carregarEstaticos]);
  useEffect(() => { carregarAtendimentos(dataSelecionada); }, [dataSelecionada, carregarAtendimentos]);

  // ── Preenchimento automático do valor ao escolher procedimento/comprimento ─

  useEffect(() => {
    if (!procedimentoId) return;
    const proc = procedimentos.find(p => p.id === procedimentoId);
    if (!proc) return;
    let preco = proc.preco_p;
    if (comprimento === 'M' && proc.preco_m) preco = proc.preco_m;
    if (comprimento === 'G' && proc.preco_g) preco = proc.preco_g;
    if (preco) setValorCobrado(String(preco));
  }, [procedimentoId, comprimento, procedimentos]);

  // ── Ações ────────────────────────────────────────────────────────────────

  const abrirNovoAgendamento = (prof, horario) => {
    setSlotSelecionado({ profissional: prof, horario });
    setCliente(''); setProcedimentoId(''); setComprimento(''); setValorCobrado('');
    setModalAberto(true);
  };

  const salvarAgendamento = async (e) => {
    e.preventDefault();
    setSalvando(true);
    const { error } = await supabase.from('atendimentos').insert([{
      data:             toISO(dataSelecionada),
      horario:          slotSelecionado.horario,
      profissional_id:  slotSelecionado.profissional.id,
      procedimento_id:  procedimentoId,
      comprimento:      comprimento || null,
      cliente,
      valor_cobrado:    valorCobrado ? Number(valorCobrado) : null,
      status:           'AGENDADO',
    }]);
    setSalvando(false);
    if (error) { alert('Erro ao salvar: ' + error.message); return; }
    setModalAberto(false);
    carregarAtendimentos(dataSelecionada);
  };

  const marcarPago = async (id, pago) => {
    await supabase.from('atendimentos').update({ pago: !pago }).eq('id', id);
    carregarAtendimentos(dataSelecionada);
    setDetalheAberto(false);
  };

  const marcarExecutado = async (id, executado) => {
    const novoStatus = !executado ? 'EXECUTADO' : 'AGENDADO';
    await supabase.from('atendimentos')
      .update({ executado: !executado, status: novoStatus })
      .eq('id', id);
    carregarAtendimentos(dataSelecionada);
    setDetalheAberto(false);
  };

  const cancelarAtendimento = async (id) => {
    if (!confirm('Cancelar este atendimento?')) return;
    await supabase.from('atendimentos')
      .update({ status: 'CANCELADO', pago: false, executado: false })
      .eq('id', id);
    carregarAtendimentos(dataSelecionada);
    setDetalheAberto(false);
  };

  const sair = () => supabase.auth.signOut();

  // ── Helpers de UI ────────────────────────────────────────────────────────

  const procSelecionado     = procedimentos.find(p => p.id === procedimentoId);
  const requerComprimento   = procSelecionado?.requer_comprimento;
  const eHoje               = toISO(dataSelecionada) === toISO(new Date());

  const totalDia = atendimentos
    .filter(a => a.status !== 'CANCELADO')
    .reduce((acc, a) => acc + (a.valor_cobrado || 0), 0);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Topbar ── */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
          <span className="text-white text-sm">✂</span>
        </div>
        <span className="font-semibold text-gray-800 text-sm">Sistema do Salão</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-gray-400">{sessao?.user?.email}</span>
          <button
            onClick={sair}
            className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="p-6 max-w-full">

        {/* ── Toolbar da agenda ── */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => setDataSelecionada(d => addDias(d, -1))}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-100"
          >‹</button>

          <span className="text-base font-semibold text-gray-800 min-w-52 text-center">
            {formatarData(dataSelecionada)}
          </span>

          <button
            onClick={() => setDataSelecionada(d => addDias(d, 1))}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-100"
          >›</button>

          {!eHoje && (
            <button
              onClick={() => setDataSelecionada(new Date())}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-100 text-gray-600"
            >
              Hoje
            </button>
          )}

          {/* Totalizador do dia */}
          {totalDia > 0 && (
            <div className="ml-4 bg-green-50 border border-green-200 rounded-lg px-4 py-1.5">
              <span className="text-xs text-green-700 font-medium">
                Total do dia: R$ {totalDia.toFixed(2).replace('.', ',')}
              </span>
            </div>
          )}

          {/* Legenda */}
          <div className="ml-auto flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-blue-200 border-l-2 border-blue-500 inline-block"/>
              Agendado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-yellow-100 border-l-2 border-yellow-500 inline-block"/>
              Executado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-green-50 border-l-2 border-green-500 inline-block"/>
              Pago
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-gray-100 border-l-2 border-gray-400 inline-block"/>
              Cancelado
            </span>
          </div>
        </div>

        {/* ── Grade ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
          {loading ? (
            <div className="p-16 text-center text-gray-400 text-sm">Carregando agenda...</div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="w-20 text-center py-3 px-4 text-xs font-semibold text-gray-500 bg-gray-50 border-r border-gray-200">
                    Horário
                  </th>
                  {profissionais.map(prof => (
                    <th key={prof.id} className="py-3 px-4 text-center border-r border-gray-200 bg-gray-50 last:border-r-0">
                      <div className="text-xs font-semibold text-gray-800 uppercase tracking-wide">{prof.nome}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5 capitalize">
                        {prof.cargo === 'PROPRIETARIO' ? 'Proprietária' : 'Funcionária'}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HORARIOS.map((horario, idx) => (
                  <tr key={horario} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="py-2 px-4 text-center text-xs font-medium text-gray-500 border-r border-gray-200 bg-gray-50">
                      {horario}
                    </td>
                    {profissionais.map(prof => {
                      const agendado = atendimentos.find(a =>
                        a.profissional_id === prof.id &&
                        a.horario.startsWith(horario)
                      );

                      if (agendado) {
                        return (
                          <td
                            key={`${prof.id}-${horario}`}
                            className="py-1 px-2 border-r border-gray-200 last:border-r-0 cursor-pointer"
                            onClick={() => { setAtendSelecionado(agendado); setDetalheAberto(true); }}
                          >
                            <div className={`rounded px-2 py-1.5 text-xs ${classeEvento(agendado)}`}>
                              <div className="font-semibold truncate">{agendado.cliente}</div>
                              <div className="truncate opacity-80 text-[10px] mt-0.5">
                                {agendado.procedimentos?.nome}
                                {agendado.comprimento && ` · ${agendado.comprimento}`}
                              </div>
                              {agendado.valor_cobrado && (
                                <div className="text-[10px] mt-0.5 opacity-70">
                                  R$ {Number(agendado.valor_cobrado).toFixed(2).replace('.', ',')}
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={`${prof.id}-${horario}`}
                          className="py-1 px-2 border-r border-gray-200 last:border-r-0 cursor-pointer hover:bg-blue-50 group h-12"
                          onClick={() => abrirNovoAgendamento(prof, horario)}
                        >
                          <span className="text-blue-400 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity block text-center">
                            + agendar
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* ══ MODAL — Novo agendamento ════════════════════════════════════════ */}
      {modalAberto && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={(e) => e.target === e.currentTarget && setModalAberto(false)}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-1">Novo Agendamento</h2>
            <p className="text-sm text-gray-500 mb-5">
              {slotSelecionado?.profissional.nome} · {slotSelecionado?.horario} · {formatarData(dataSelecionada)}
            </p>

            <form onSubmit={salvarAgendamento} className="space-y-4">

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome da cliente</label>
                <input
                  type="text" required autoFocus
                  value={cliente} onChange={e => setCliente(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
                  placeholder="Ex: Maria Silva"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Procedimento</label>
                <select
                  required value={procedimentoId}
                  onChange={e => { setProcedimentoId(e.target.value); setComprimento(''); setValorCobrado(''); }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
                >
                  <option value="">Selecione...</option>
                  {procedimentos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>

              {requerComprimento && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Comprimento do cabelo</label>
                  <div className="flex gap-2">
                    {['P','M','G'].map(c => (
                      <button
                        key={c} type="button"
                        onClick={() => setComprimento(c)}
                        className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                          comprimento === c
                            ? 'bg-gray-800 text-white border-gray-800'
                            : 'border-gray-300 text-gray-600 hover:border-gray-500'
                        }`}
                      >
                        {c === 'P' ? 'Curto (P)' : c === 'M' ? 'Médio (M)' : 'Longo (G)'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Valor cobrado (R$)
                  {valorCobrado && <span className="text-gray-400 font-normal ml-1">— preenchido automaticamente</span>}
                </label>
                <input
                  type="number" step="0.01" min="0"
                  value={valorCobrado} onChange={e => setValorCobrado(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
                  placeholder="0,00"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={() => setModalAberto(false)}
                  className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={salvando}
                  className="flex-1 py-2.5 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50"
                >
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL — Detalhes e ações ════════════════════════════════════════ */}
      {detalheAberto && atendSelecionado && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={(e) => e.target === e.currentTarget && setDetalheAberto(false)}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-800">{atendSelecionado.cliente}</h2>
                <p className="text-sm text-gray-500">
                  {atendSelecionado.horario?.slice(0,5)} · {atendSelecionado.profissionais?.nome}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                atendSelecionado.status === 'CANCELADO' ? 'bg-gray-100 text-gray-600' :
                atendSelecionado.pago ? 'bg-green-100 text-green-700' :
                atendSelecionado.executado ? 'bg-yellow-100 text-yellow-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {atendSelecionado.status === 'CANCELADO' ? 'Cancelado' :
                 atendSelecionado.pago ? 'Pago' :
                 atendSelecionado.executado ? 'Executado' : 'Agendado'}
              </span>
            </div>

            {/* Dados do atendimento */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm mb-5">
              <div className="flex justify-between">
                <span className="text-gray-500">Procedimento</span>
                <span className="font-medium">
                  {atendSelecionado.procedimentos?.nome}
                  {atendSelecionado.comprimento && ` · ${atendSelecionado.comprimento}`}
                </span>
              </div>
              {atendSelecionado.valor_cobrado && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Valor cobrado</span>
                  <span className="font-semibold text-gray-800">
                    R$ {Number(atendSelecionado.valor_cobrado).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              )}
              {atendSelecionado.lucro_liquido != null && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Lucro líquido</span>
                  <span className={`font-medium ${atendSelecionado.lucro_liquido >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    R$ {Number(atendSelecionado.lucro_liquido).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              )}
            </div>

            {/* Ações — só disponíveis se não cancelado */}
            {atendSelecionado.status !== 'CANCELADO' ? (
              <div className="space-y-2">
                <button
                  onClick={() => marcarExecutado(atendSelecionado.id, atendSelecionado.executado)}
                  className={`w-full py-2.5 text-sm rounded-lg border transition-colors ${
                    atendSelecionado.executado
                      ? 'bg-yellow-50 border-yellow-300 text-yellow-800 hover:bg-yellow-100'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {atendSelecionado.executado ? '✓ Executado — desfazer' : 'Marcar como executado'}
                </button>

                <button
                  onClick={() => marcarPago(atendSelecionado.id, atendSelecionado.pago)}
                  className={`w-full py-2.5 text-sm rounded-lg border transition-colors ${
                    atendSelecionado.pago
                      ? 'bg-green-50 border-green-300 text-green-800 hover:bg-green-100'
                      : 'bg-gray-800 text-white border-gray-800 hover:bg-gray-900'
                  }`}
                >
                  {atendSelecionado.pago ? '✓ Pago — desfazer' : 'Marcar como pago'}
                </button>

                <button
                  onClick={() => cancelarAtendimento(atendSelecionado.id)}
                  className="w-full py-2.5 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                >
                  Cancelar atendimento
                </button>
              </div>
            ) : (
              <p className="text-center text-sm text-gray-400">Atendimento cancelado.</p>
            )}

            <button
              onClick={() => setDetalheAberto(false)}
              className="w-full mt-3 py-2 text-xs text-gray-400 hover:text-gray-600"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
