import React, { useState } from 'react';
import { Clock, User, Scissors, DollarSign, X, CheckCircle2, AlertCircle, AlertTriangle, UserPlus, List } from 'lucide-react';

const Agenda = () => {
  // 1. CONFIGURAÇÕES GLOBAIS
  const configs = { custo_fixo: 29.0, taxa_maquininha: 5.0 };

  // 2. DADOS BASE
  const profissionais = [
    { id: 1, nome: 'Ricardo' },
    { id: 2, nome: 'Amanda' },
    { id: 3, nome: 'Beatriz' }
  ];

  const procedimentos = [
    { id: 1, nome: 'Progressiva', comissao: 30, custo_p: 20, custo_m: 35, custo_g: 50, preco_p: 150, preco_m: 220, preco_g: 300 },
    { id: 2, nome: 'Mechas', comissao: 40, custo_p: 45, custo_m: 70, custo_g: 100, preco_p: 350, preco_m: 500, preco_g: 750 },
    { id: 3, nome: 'Corte', comissao: 50, custo_p: 5, custo_m: 5, custo_g: 5, preco_p: 80, preco_m: 80, preco_g: 80 }
  ];

  // ESTADO DOS CLIENTES (CRM)
  const [clientes, setClientes] = useState([
    { id: 1, nome: 'JULIANA SILVA', telefone: '11999999999' },
    { id: 2, nome: 'MARIA CLARA', telefone: '11888888888' }
  ]);

  const horarios = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

  // 3. ESTADOS DA TELA
  const [agendamentos, setAgendamentos] = useState([
    { id: 1, hora: '09:00', profId: 1, clienteNome: 'JULIANA SILVA', servico: 'Progressiva', tamanho: 'M', valor: 220, lucro: 85.50 }
  ]);
  const [modalAberto, setModalAberto] = useState(false);
  const [selecao, setSelecao] = useState({ hora: '', profId: null });
  
  // Controle do Formulário
  const [novo, setNovo] = useState({ clienteId: '', procId: '', tamanho: 'M', valor: 0 });
  const [isNovoCliente, setIsNovoCliente] = useState(false);
  const [formNovoCliente, setFormNovoCliente] = useState({ nome: '', telefone: '' });

  // 4. LÓGICA DE CÁLCULO
  const calcularPrevisto = () => {
    const proc = procedimentos.find(p => p.id === Number(novo.procId));
    if (!proc) return { lucro: 0, margem: 0, prejuizo: false, valorSugerido: 0 };

    const faturamento = Number(novo.valor || 0);
    const custoMaterial = proc[`custo_${novo.tamanho.toLowerCase()}`];
    const comissaoVal = faturamento * (proc.comissao / 100);
    const taxaVal = faturamento * (configs.taxa_maquininha / 100);
    
    const lucro = faturamento - custoMaterial - configs.custo_fixo - comissaoVal - taxaVal;
    return {
      lucro,
      margem: faturamento > 0 ? (lucro / faturamento) * 100 : 0,
      prejuizo: lucro < 0,
      valorSugerido: proc[`preco_${novo.tamanho.toLowerCase()}`]
    };
  };

  const abrirAgendamento = (hora, profId) => {
    setSelecao({ hora, profId });
    setNovo({ clienteId: '', procId: '', tamanho: 'M', valor: 0 });
    setIsNovoCliente(false);
    setFormNovoCliente({ nome: '', telefone: '' });
    setModalAberto(true);
  };

  const salvar = () => {
    let nomeClienteFinal = '';

    // Se for cliente nova, salva na lista de clientes primeiro
    if (isNovoCliente) {
      if (!formNovoCliente.nome) return alert('Digite o nome da cliente!');
      const novoId = Date.now();
      nomeClienteFinal = formNovoCliente.nome.toUpperCase();
      setClientes([...clientes, { id: novoId, nome: nomeClienteFinal, telefone: formNovoCliente.telefone }]);
    } else {
      if (!novo.clienteId) return alert('Selecione uma cliente!');
      nomeClienteFinal = clientes.find(c => c.id === Number(novo.clienteId)).nome;
    }

    const proc = procedimentos.find(p => p.id === Number(novo.procId));
    const { lucro } = calcularPrevisto();
    
    const novoAgend = {
      id: Date.now(),
      hora: selecao.hora,
      profId: selecao.profId,
      clienteNome: nomeClienteFinal,
      servico: proc.nome,
      tamanho: novo.tamanho,
      valor: novo.valor,
      lucro: lucro
    };
    
    setAgendamentos([...agendamentos, novoAgend]);
    setModalAberto(false);
  };

  const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="p-4 bg-slate-50 min-h-screen font-sans">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-800">Agenda de Controle</h1>
        <p className="text-slate-500 text-sm">Clique no horário para lançar o faturamento.</p>
      </div>

      {/* GRADE ESTILO PLANILHA */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="p-3 border border-slate-700 text-xs w-20">HORA</th>
              {profissionais.map(p => (
                <th key={p.id} className="p-3 border border-slate-700 text-xs uppercase tracking-widest">{p.nome}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {horarios.map(hora => (
              <tr key={hora}>
                <td className="p-3 border border-slate-100 bg-slate-50 text-center font-bold text-slate-400 text-xs">{hora}</td>
                {profissionais.map(prof => {
                  const agend = agendamentos.find(a => a.hora === hora && a.profId === prof.id);
                  return (
                    <td 
                      key={prof.id} 
                      onClick={() => !agend && abrirAgendamento(hora, prof.id)}
                      className={`p-1 border border-slate-100 h-16 cursor-pointer transition-all ${!agend ? 'hover:bg-emerald-50' : ''}`}
                    >
                      {agend ? (
                        <div className="h-full w-full bg-slate-800 text-white rounded-lg p-2 text-[10px] relative overflow-hidden group">
                          <div className="font-bold border-b border-slate-600 mb-1">{agend.clienteNome}</div>
                          <div>{agend.servico} ({agend.tamanho})</div>
                          <div className={`absolute bottom-1 right-1 px-1 rounded font-black ${agend.lucro > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}>
                            {fmt(agend.lucro)}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full w-full flex items-center justify-center opacity-0 hover:opacity-100">
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

      {/* PAINEL LATERAL (MODAL) */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-end z-50">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto animate-slideInRight">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-xl font-black text-slate-900">Novo Atendimento</h2>
                <p className="text-xs text-slate-500 font-bold uppercase">{selecao.hora} — Prof. {profissionais.find(p => p.id === selecao.profId)?.nome}</p>
              </div>
              <button onClick={() => setModalAberto(false)} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
            </div>

            <div className="space-y-6">
              
              {/* BLOCO DE CLIENTE: SELECIONAR OU CADASTRAR */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[10px] font-black uppercase text-slate-500">Cliente</label>
                  <button 
                    onClick={() => setIsNovoCliente(!isNovoCliente)}
                    className="text-[10px] font-bold text-blue-600 flex items-center gap-1 hover:underline"
                  >
                    {isNovoCliente ? <><List size={12}/> Escolher da Lista</> : <><UserPlus size={12}/> Cadastrar Nova</>}
                  </button>
                </div>

                {isNovoCliente ? (
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      placeholder="NOME DA CLIENTE"
                      className="w-full border border-slate-300 rounded-lg p-2 outline-none focus:border-blue-500 font-bold text-sm uppercase"
                      value={formNovoCliente.nome} 
                      onChange={e => setFormNovoCliente({...formNovoCliente, nome: e.target.value.toUpperCase()})}
                    />
                    <input 
                      type="text" 
                      placeholder="WhatsApp (Ex: 11999999999)"
                      className="w-full border border-slate-300 rounded-lg p-2 outline-none focus:border-blue-500 font-bold text-sm"
                      value={formNovoCliente.telefone} 
                      onChange={e => setFormNovoCliente({...formNovoCliente, telefone: e.target.value})}
                    />
                  </div>
                ) : (
                  <select 
                    className="w-full border border-slate-300 rounded-lg p-2 outline-none focus:border-emerald-500 font-bold text-sm bg-white"
                    value={novo.clienteId}
                    onChange={e => setNovo({...novo, clienteId: e.target.value})}
                  >
                    <option value="">Selecione a cliente...</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                )}
              </div>

              {/* SERVIÇO E TAMANHO */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Serviço</label>
                <select 
                  className="w-full border-b-2 border-slate-100 py-2 outline-none focus:border-emerald-500 font-bold bg-transparent"
                  onChange={e => {
                    const p = procedimentos.find(x => x.id === Number(e.target.value));
                    setNovo({...novo, procId: e.target.value, valor: p ? p[`preco_${novo.tamanho.toLowerCase()}`] : 0});
                  }}
                >
                  <option value="">Selecione...</option>
                  {procedimentos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Tamanho do Cabelo</label>
                <div className="flex gap-4 mt-2">
                  {['P', 'M', 'G'].map(t => (
                    <button 
                      key={t}
                      onClick={() => {
                        const p = procedimentos.find(x => x.id === Number(novo.procId));
                        setNovo({...novo, tamanho: t, valor: p ? p[`preco_${t.toLowerCase()}`] : 0});
                      }}
                      className={`flex-1 py-2 rounded-xl font-black border-2 transition-all ${novo.tamanho === t ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-100 text-slate-400'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* VALOR E CÁLCULO COM ALERTA DE PREJUÍZO */}
              {(() => {
                const { lucro, margem, prejuizo, valorSugerido } = calcularPrevisto();
                return (
                  <div className={`p-4 rounded-2xl border-2 transition-all duration-300 ${
                    prejuizo ? 'bg-red-50 border-red-500 animate-pulse' : 'bg-slate-50 border-transparent'
                  }`}>
                    <div className="flex justify-between items-start mb-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">Valor Cobrado (R$)</label>
                      {valorSugerido > 0 && (
                        <span className="text-[9px] font-black bg-slate-200 text-slate-600 px-2 py-1 rounded">
                          SUGERIDO: {fmt(valorSugerido)}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      className={`w-full bg-transparent text-4xl font-black outline-none ${
                        prejuizo ? 'text-red-600' : 'text-slate-900'
                      }`}
                      value={novo.valor}
                      onChange={e => setNovo({...novo, valor: e.target.value})}
                    />

                    <div className={`mt-4 pt-4 border-t ${
                      prejuizo ? 'border-red-200' : 'border-slate-200'
                    } flex justify-between items-end`}>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Lucro Líquido</p>
                        <p className={`text-xl font-black ${prejuizo ? 'text-red-600' : 'text-emerald-600'}`}>
                          {fmt(lucro)}
                        </p>
                      </div>
                      <div className="text-right">
                        {prejuizo ? (
                          <div className="flex items-center gap-1 text-red-600 animate-bounce">
                            <AlertTriangle size={18} />
                            <span className="text-[10px] font-black uppercase">Prejuízo!</span>
                          </div>
                        ) : (
                          <>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Margem</p>
                            <p className="text-sm font-black text-blue-600">{margem.toFixed(1)}%</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {(() => {
                const { prejuizo } = calcularPrevisto();
                return (
                  <button
                    onClick={salvar}
                    className={`w-full py-4 rounded-2xl font-black text-lg transition-all shadow-xl ${
                      prejuizo
                        ? 'bg-red-600 text-white shadow-red-200 hover:bg-red-700'
                        : 'bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-700'
                    }`}
                  >
                    {prejuizo ? 'CONFIRMAR MESMO COM PREJUÍZO' : 'CONFIRMAR ATENDIMENTO'}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-200">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

export default Agenda;