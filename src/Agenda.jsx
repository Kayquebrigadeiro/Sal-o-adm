import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function Agenda() {
  const [profissionais, setProfissionais] = useState([]);
  const [procedimentos, setProcedimentos] = useState([]);
  const [atendimentos, setAtendimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usandoDadosFake, setUsandoDadosFake] = useState(false);

  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [slotSelecionado, setSlotSelecionado] = useState(null);
  
  // Estados do Formulário
  const [cliente, setCliente] = useState('');
  const [procedimentoId, setProcedimentoId] = useState('');
  const [comprimento, setComprimento] = useState('');

  // Temporário: no futuro isso virá do cadastro do salão feito pelo Vendedor
  const horarios = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30', '19:00'
  ];

  const carregarDados = async () => {
    // Pega a data de hoje formatada (AAAA-MM-DD)
    const hojeStr = new Date().toISOString().split('T')[0];

    // Busca Profissionais
    const { data: profData } = await supabase
      .from('profissionais')
      .select('*')
      .eq('ativo', true)
      .order('nome');
      
    if (profData && profData.length > 0) {
      setProfissionais(profData);
      setUsandoDadosFake(false);
    } else {
      setUsandoDadosFake(true);
      // Fallback Fake para você testar a interface!
      setProfissionais([
        { id: '11111111-1111-1111-1111-111111111111', nome: 'Yara (Teste)' },
        { id: '22222222-2222-2222-2222-222222222222', nome: 'Geovana (Teste)' }
      ]);
    }

    // Busca Procedimentos
    const { data: procData } = await supabase
      .from('procedimentos')
      .select('*')
      .eq('ativo', true)
      .order('nome');
      
    if (procData && procData.length > 0) {
      setProcedimentos(procData);
    } else {
      // Fallback Fake para você testar a interface!
      setProcedimentos([
        { id: '33333333-3333-3333-3333-333333333333', nome: 'Unhas', requer_comprimento: false },
        { id: '44444444-4444-4444-4444-444444444444', nome: 'Luzes', requer_comprimento: true }
      ]);
    }

    // Busca Atendimentos de hoje (para preencher a tabela)
    const { data: atenData } = await supabase
      .from('atendimentos')
      .select(`*, procedimentos(nome)`)
      .eq('data', hojeStr);
      
    if (atenData) {
      setAtendimentos(atenData);
    }

    setLoading(false);
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const abrirModal = (profissional, horario) => {
    setSlotSelecionado({ profissional, horario });
    setCliente('');
    setProcedimentoId('');
    setComprimento('');
    setIsModalOpen(true);
  };

  const fecharModal = () => {
    setIsModalOpen(false);
    setSlotSelecionado(null);
  };

  const salvarAgendamento = async (e) => {
    e.preventDefault();

    if (usandoDadosFake) {
      alert('⚠️ Você está usando dados de teste!\n\nSe o banco já tiver as tabelas, garanta que ajustou as políticas (RLS) para permitir o acesso.');
      return;
    }
    
    const hoje = new Date().toISOString().split('T')[0];

    const { error } = await supabase.from('atendimentos').insert([{
      data: hoje,
      horario: slotSelecionado.horario,
      profissional_id: slotSelecionado.profissional.id,
      procedimento_id: procedimentoId,
      comprimento: comprimento || null,
      cliente: cliente,
      status: 'AGENDADO'
    }]);

    if (error) {
      alert('Erro ao agendar: ' + error.message);
    } else {
      alert('Agendado com sucesso!');
      fecharModal();
      carregarDados(); // Recarrega os dados do banco para desenhar o quadrado na agenda!
    }
  };

  const procedimentoSelecionado = procedimentos.find(p => p.id === procedimentoId);
  const requerComprimento = procedimentoSelecionado?.requer_comprimento;

  if (loading) return <div className="p-10 text-center">Carregando sistema...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Agenda do Dia</h1>

        {/* GRADE DE HORÁRIOS */}
        <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="px-6 py-4 font-semibold text-center w-24 border-r border-gray-700">Horário</th>
                  {profissionais.map(prof => (
                    <th key={prof.id} className="px-6 py-4 font-semibold text-center border-r border-gray-700 uppercase">{prof.nome}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {horarios.map(horario => (
                  <tr key={horario} className="hover:bg-gray-50 group">
                    <td className="px-6 py-4 text-center font-bold text-gray-700 bg-gray-100 border-r border-gray-200">{horario}</td>
                    {profissionais.map(prof => {
                      
                      // Verifica se já existe agendamento neste horário(startsWith pois o DB retorna 08:00:00)
                      const agendada = atendimentos.find(a => 
                        a.profissional_id === prof.id && 
                        a.horario.startsWith(horario)
                      );

                      if (agendada) {
                        return (
                          <td 
                            key={`${prof.id}-${horario}`} 
                            className="px-6 py-4 text-center border-r border-gray-200 relative h-16 bg-blue-100"
                          >
                            <div className="flex flex-col items-center justify-center h-full">
                              <span className="font-bold text-blue-900 text-xs uppercase truncate max-w-full block px-1">
                                {agendada.cliente}
                              </span>
                              <span className="text-[10px] text-blue-700 truncate max-w-full block px-1 mt-0.5">
                                {agendada.procedimentos?.nome || 'Serviço'}
                              </span>
                            </div>
                          </td>
                        );
                      }

                      // Se estiver livre, mostra opção de agendar
                      return (
                        <td 
                          key={`${prof.id}-${horario}`} 
                          className="px-6 py-4 text-center border-r border-gray-200 cursor-pointer hover:bg-blue-50 relative h-16"
                          onClick={() => abrirModal(prof, horario)}
                        >
                          <span className="text-blue-500 font-medium text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                            + Agendar
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL DE AGENDAMENTO (CÓDIGO MANTIDO) */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-800">Novo Agendamento</h2>
              <p className="text-sm text-gray-500 mb-6">
                Com <strong className="text-gray-700">{slotSelecionado?.profissional.nome}</strong> às <strong className="text-gray-700">{slotSelecionado?.horario}</strong>
              </p>

              <form onSubmit={salvarAgendamento} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Cliente</label>
                  <input type="text" required className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" value={cliente} onChange={(e) => setCliente(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Procedimento</label>
                  <select required className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" value={procedimentoId} onChange={(e) => { setProcedimentoId(e.target.value); setComprimento(''); }}>
                    <option value="">Selecione...</option>
                    {procedimentos.map(proc => <option key={proc.id} value={proc.id}>{proc.nome}</option>)}
                  </select>
                </div>
                {requerComprimento && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Comprimento do Cabelo</label>
                    <select required className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" value={comprimento} onChange={(e) => setComprimento(e.target.value)}>
                      <option value="">Selecione...</option>
                      <option value="P">Curto (P)</option>
                      <option value="M">Médio (M)</option>
                      <option value="G">Longo (G)</option>
                    </select>
                  </div>
                )}
                <div className="flex justify-end space-x-3 mt-6">
                  <button type="button" onClick={fecharModal} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
                  <button type="submit" className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900">Salvar Agendamento</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
