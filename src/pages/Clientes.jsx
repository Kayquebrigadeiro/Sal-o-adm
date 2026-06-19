import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { Plus, Search, Phone, MessageCircle, Calendar, History, User, FileText, UserPlus } from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Clientes({ salaoId }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');

  const [modalAberto, setModalAberto] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [totalGasto, setTotalGasto] = useState(0);

  const [form, setForm] = useState({ id: null, nome: '', telefone: '' });

  useEffect(() => {
    if (salaoId) carregarClientes();
  }, [salaoId]);

  const carregarClientes = async () => {
    setLoading(true);
    try {
      // 1. Carregar clientes
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, nome, telefone')
        .eq('salao_id', salaoId)
        .order('nome');

      // 2. Carregar resumo financeiro agregado por nome de cliente (atendimentos EXECUTADOS)
      const { data: resumoData } = await supabase
        .from('atendimentos')
        .select('cliente, valor_cobrado, data')
        .eq('salao_id', salaoId)
        .eq('status', 'EXECUTADO');

      // 3. Agregar por nome de cliente
      const resumoMap = {};
      (resumoData || []).forEach(a => {
        const nome = a.cliente;
        if (!resumoMap[nome]) {
          resumoMap[nome] = { total_gasto: 0, ultima_visita: null, total_atendimentos: 0 };
        }
        resumoMap[nome].total_gasto += Number(a.valor_cobrado || 0);
        resumoMap[nome].total_atendimentos += 1;
        if (!resumoMap[nome].ultima_visita || a.data > resumoMap[nome].ultima_visita) {
          resumoMap[nome].ultima_visita = a.data;
        }
      });

      // 4. Mesclar dados
      const clientesMerged = (clientesData || []).map(c => ({
        ...c,
        total_gasto: resumoMap[c.nome]?.total_gasto || 0,
        ultima_visita: resumoMap[c.nome]?.ultima_visita || null,
        total_atendimentos: resumoMap[c.nome]?.total_atendimentos || 0,
      }));

      setClientes(clientesMerged);
    } catch (err) {
      showToast('Erro ao carregar clientes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const salvarCliente = async () => {
    if (!form.nome) return showToast('O nome é obrigatório.', 'error');

    let erro;
    if (form.id) {
      const { error } = await supabase.from('clientes').update({ nome: form.nome, telefone: form.telefone }).eq('id', form.id).eq('salao_id', salaoId);
      erro = error;
    } else {
      const { error } = await supabase.from('clientes').insert({ salao_id: salaoId, nome: form.nome, telefone: form.telefone || null });
      erro = error;
    }

    if (erro) showToast('Erro ao salvar cliente', 'error');
    else {
      showToast('Cliente guardado com sucesso!', 'success');
      setModalAberto(false);
      carregarClientes();
    }
  };

  const abrirFicha = async (cliente) => {
    setClienteSelecionado(cliente);

    // Busca por nome na v_atendimentos_completo para obter múltiplos procedimentos
    const { data } = await supabase
      .from('v_atendimentos_completo')
      .select('data, horario, valor_cobrado, status, procedimentos')
      .eq('salao_id', salaoId)
      .eq('cliente', cliente.nome)
      .order('data', { ascending: false });

    setHistorico(data || []);
    // Usar o total pré-computado (apenas EXECUTADOS) para consistência
    setTotalGasto(cliente.total_gasto || 0);
  };

  const abrirWhatsApp = (telefone) => {
    if (!telefone) return;
    window.open(`https://wa.me/55${telefone.replace(/\D/g, '')}`, '_blank');
  };

  const clientesFiltrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (c.telefone && c.telefone.includes(busca))
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">Gestão de Clientes (CRM)</h1>
          <p className="text-gray-500 text-sm">Histórico e fidelização da base de dados.</p>
        </div>
        <button
          onClick={() => { setForm({ id: null, nome: '', telefone: '' }); setModalAberto(true); }}
          className="bg-white text-gray-800 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-sky-500 hover:text-white transition-all text-sm shadow-lg"
        >
          <UserPlus size={18} /> Nova Cliente
        </button>
      </div>

      {/* BARRA DE BUSCA */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -tranblue-y-1/2 text-gray-500" size={20} />
        <input
          type="text"
          placeholder="Procurar por nome ou telefone..."
          className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm font-medium"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {/* TABELA DE CLIENTES */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-widest">
              <th className="p-4">Nome da Cliente</th>
              <th className="p-4">Contacto</th>
              <th className="p-4 text-right">Total Gasto (LTV)</th>
              <th className="p-4 text-center">Última Visita</th>
              <th className="p-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map(cliente => (
              <tr key={cliente.id} className="border-b border-blue-50 hover:bg-gray-50/50 transition-colors">
                <td className="p-4 font-bold text-gray-800">{cliente.nome}</td>
                <td className="p-4 text-gray-500 font-medium text-sm">{cliente.telefone || '—'}</td>
                <td className="p-4 text-right">
                  <span className="font-black text-emerald-600">{fmt(cliente.total_gasto || 0)}</span>
                </td>
                <td className="p-4 text-center text-gray-500 text-xs font-bold">
                  {cliente.ultima_visita
                    ? new Date(cliente.ultima_visita + 'T12:00:00').toLocaleDateString('pt-BR')
                    : '—'}
                </td>
                <td className="p-4">
                  <div className="flex justify-center gap-2">
                    <button
                      title="Chamar no WhatsApp"
                      onClick={() => abrirWhatsApp(cliente.telefone)}
                      disabled={!cliente.telefone}
                      className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-30"
                    >
                      <MessageCircle size={18} />
                    </button>
                    <button
                      title="Ver Ficha Completa"
                      onClick={() => abrirFicha(cliente)}
                      className="p-2 bg-sky-50 text-gray-500 rounded-lg hover:bg-sky-500 hover:text-gray-800 transition-all"
                    >
                      <FileText size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {clientesFiltrados.length === 0 && (
              <tr>
                <td colSpan={5} className="py-16 text-center text-gray-500">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User size={32} className="text-gray-400" />
                  </div>
                  <p className="text-lg font-black text-gray-800 uppercase mb-1">Nenhum cliente encontrado</p>
                  <p className="text-sm font-medium text-gray-500">Adicione o primeiro cliente para começar a construir seu CRM!</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL NOVO/EDITAR CLIENTE */}
      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={form.id ? 'Editar Cliente' : 'Novo Cliente'}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-gray-600 mb-1 block">Nome Completo</label>
            <input
              type="text"
              className="w-full border-2 border-gray-200 p-3 rounded-2xl focus:border-sky-500 outline-none"
              value={form.nome}
              onChange={e => setForm({...form, nome: e.target.value.toUpperCase()})}
            />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-600 mb-1 block">Telemóvel / WhatsApp</label>
            <input
              type="text"
              className="w-full border-2 border-gray-200 p-3 rounded-2xl focus:border-sky-500 outline-none"
              value={form.telefone}
              onChange={e => setForm({...form, telefone: e.target.value})}
              placeholder="(00) 00000-0000"
            />
          </div>
          <button onClick={salvarCliente} className="w-full bg-white text-gray-800 py-4 rounded-2xl font-bold hover:bg-sky-500 hover:text-white transition-all mt-4">
            Guardar Cliente
          </button>
        </div>
      </Modal>

      {/* FICHA HISTÓRICA (inline, sem componente Modal) */}
      {clienteSelecionado && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-black text-gray-800">{clienteSelecionado.nome}</h2>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-tighter">Histórico Financeiro</p>
              </div>
              <button onClick={() => setClienteSelecionado(null)} className="text-gray-500 hover:text-gray-500 text-2xl font-bold">&times;</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-emerald-50 p-4 rounded-2xl flex justify-between items-center">
                <span className="text-emerald-700 font-bold text-sm">Investimento Total no Salão:</span>
                <span className="text-2xl font-black text-emerald-600">{fmt(totalGasto)}</span>
              </div>

              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                <p className="text-[10px] font-black text-gray-500 uppercase">Últimos Atendimentos</p>
                {historico.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">Nenhum atendimento registado.</p>
                )}
                {historico.map((a, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-3 flex justify-between items-center text-sm">
                    <div>
                      <p className="font-bold text-gray-800">{a.procedimentos?.nome || 'Procedimento apagado'}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(a.data + 'T12:00:00').toLocaleDateString('pt-BR')} às {a.horario?.slice(0, 5)}
                      </p>
                    </div>
                    <p className="font-black text-emerald-600">{fmt(a.valor_cobrado)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-gray-50">
              <button
                onClick={() => setClienteSelecionado(null)}
                className="w-full bg-white text-gray-800 py-3 rounded-xl font-bold hover:bg-sky-500 hover:text-white transition-all"
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
