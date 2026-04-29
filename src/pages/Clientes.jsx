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
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .eq('salao_id', salaoId)
      .order('nome');
    setClientes(data || []);
    setLoading(false);
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

    const { data } = await supabase
      .from('atendimentos')
      .select('data, horario, valor_cobrado, procedimentos(nome)')
      .eq('salao_id', salaoId)
      .eq('cliente', cliente.nome)
      .order('data', { ascending: false });

    setHistorico(data || []);
    setTotalGasto((data || []).reduce((acc, curr) => acc + Number(curr.valor_cobrado || 0), 0));
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
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Gestão de Clientes (CRM)</h1>
          <p className="text-slate-500 text-sm">Histórico e fidelização da base de dados.</p>
        </div>
        <button
          onClick={() => { setForm({ id: null, nome: '', telefone: '' }); setModalAberto(true); }}
          className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all text-sm shadow-lg"
        >
          <UserPlus size={18} /> Nova Cliente
        </button>
      </div>

      {/* BARRA DE BUSCA */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Procurar por nome ou telefone..."
          className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm font-medium"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {/* TABELA DE CLIENTES */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <th className="p-4">Nome da Cliente</th>
              <th className="p-4">Contacto</th>
              <th className="p-4 text-right">Total Gasto (LTV)</th>
              <th className="p-4 text-center">Última Visita</th>
              <th className="p-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map(cliente => (
              <tr key={cliente.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="p-4 font-bold text-slate-800">{cliente.nome}</td>
                <td className="p-4 text-slate-500 font-medium text-sm">{cliente.telefone || '—'}</td>
                <td className="p-4 text-right">
                  <span className="font-black text-emerald-600">{fmt(cliente.total_gasto || 0)}</span>
                </td>
                <td className="p-4 text-center text-slate-400 text-xs font-bold">
                  {cliente.ultima_visita
                    ? new Date(cliente.ultima_visita).toLocaleDateString('pt-BR')
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
                      className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-800 hover:text-white transition-all"
                    >
                      <FileText size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {clientesFiltrados.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  <User size={40} className="mx-auto mb-2 opacity-30" />
                  Nenhum cliente encontrado.
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
            <label className="text-sm font-bold text-slate-700 mb-1 block">Nome Completo</label>
            <input
              type="text"
              className="w-full border-2 border-slate-100 p-3 rounded-2xl focus:border-slate-900 outline-none"
              value={form.nome}
              onChange={e => setForm({...form, nome: e.target.value.toUpperCase()})}
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">Telemóvel / WhatsApp</label>
            <input
              type="text"
              className="w-full border-2 border-slate-100 p-3 rounded-2xl focus:border-slate-900 outline-none"
              value={form.telefone}
              onChange={e => setForm({...form, telefone: e.target.value})}
              placeholder="(00) 00000-0000"
            />
          </div>
          <button onClick={salvarCliente} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all mt-4">
            Guardar Cliente
          </button>
        </div>
      </Modal>

      {/* FICHA HISTÓRICA (inline, sem componente Modal) */}
      {clienteSelecionado && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-black text-slate-900">{clienteSelecionado.nome}</h2>
                <p className="text-sm text-slate-500 font-bold uppercase tracking-tighter">Histórico Financeiro</p>
              </div>
              <button onClick={() => setClienteSelecionado(null)} className="text-slate-400 hover:text-slate-600 text-2xl font-bold">&times;</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-emerald-50 p-4 rounded-2xl flex justify-between items-center">
                <span className="text-emerald-700 font-bold text-sm">Investimento Total no Salão:</span>
                <span className="text-2xl font-black text-emerald-600">{fmt(totalGasto)}</span>
              </div>

              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                <p className="text-[10px] font-black text-slate-400 uppercase">Últimos Atendimentos</p>
                {historico.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">Nenhum atendimento registado.</p>
                )}
                {historico.map((a, i) => (
                  <div key={i} className="border border-slate-100 rounded-xl p-3 flex justify-between items-center text-sm">
                    <div>
                      <p className="font-bold text-slate-800">{a.procedimentos?.nome || 'Procedimento apagado'}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(a.data + 'T12:00:00').toLocaleDateString('pt-BR')} às {a.horario?.slice(0, 5)}
                      </p>
                    </div>
                    <p className="font-black text-emerald-600">{fmt(a.valor_cobrado)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-slate-50">
              <button
                onClick={() => setClienteSelecionado(null)}
                className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all"
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
