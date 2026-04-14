import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { 
  Plus, Search, Phone, MessageCircle, 
  Calendar, History, User, ArrowRight 
} from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Clientes({ salaoId }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  
  // Modais
  const [modalAberto, setModalAberto] = useState(false);
  const [modalHistorico, setModalHistorico] = useState(false);
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
      const { error } = await supabase.from('clientes').update({ nome: form.nome, telefone: form.telefone }).eq('id', form.id);
      erro = error;
    } else {
      const { error } = await supabase.from('clientes').insert([{ salao_id: salaoId, nome: form.nome, telefone: form.telefone }]);
      erro = error;
    }

    if (erro) showToast('Erro ao salvar cliente', 'error');
    else {
      showToast('Cliente guardado com sucesso!', 'success');
      setModalAberto(false);
      carregarClientes();
    }
  };

  const abrirHistorico = async (cliente) => {
    setClienteSelecionado(cliente);
    setModalHistorico(true);
    
    // Busca os atendimentos passados desta cliente
    const { data } = await supabase
      .from('atendimentos')
      .select('data, horario, valor_cobrado, procedimentos(nome)')
      .eq('salao_id', salaoId)
      .eq('cliente', cliente.nome) // Ligação pelo nome baseada na estrutura atual
      .order('data', { ascending: false });

    setHistorico(data || []);
    const total = (data || []).reduce((acc, curr) => acc + Number(curr.valor_cobrado || 0), 0);
    setTotalGasto(total);
  };

  const abrirWhatsApp = (telefone) => {
    if (!telefone) return;
    const numeroLimpo = telefone.replace(/\D/g, '');
    window.open(`https://wa.me/55${numeroLimpo}`, '_blank');
  };

  const clientesFiltrados = clientes.filter(c => 
    c.nome.toLowerCase().includes(busca.toLowerCase()) || 
    (c.telefone && c.telefone.includes(busca))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Clientes</h1>
          <p className="text-slate-500">A sua base de contactos e histórico de atendimentos.</p>
        </div>
        <button 
          onClick={() => { setForm({ id: null, nome: '', telefone: '' }); setModalAberto(true); }}
          className="w-full md:w-auto bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg"
        >
          <Plus size={20} /> Novo Cliente
        </button>
      </div>

      {/* Barra de Pesquisa */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm mb-6 flex items-center gap-3">
        <Search className="text-slate-400" size={24} />
        <input 
          type="text" 
          placeholder="Procurar por nome ou número de telemóvel..." 
          className="w-full bg-transparent border-none outline-none text-slate-700 font-medium placeholder:font-normal"
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      {/* Lista / Grelha de Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clientesFiltrados.map(cliente => (
          <div key={cliente.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold text-lg">
                  {cliente.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{cliente.nome}</h3>
                  <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                    <Phone size={12} /> {cliente.telefone || 'Sem contacto'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-slate-50">
              <button 
                onClick={() => abrirHistorico(cliente)}
                className="flex-1 bg-slate-50 text-slate-700 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
              >
                <History size={16} /> Histórico
              </button>
              
              <button 
                onClick={() => abrirWhatsApp(cliente.telefone)}
                disabled={!cliente.telefone}
                className="flex-1 bg-green-50 text-green-700 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-green-100 transition-colors disabled:opacity-40 disabled:grayscale"
              >
                <MessageCircle size={16} /> WhatsApp
              </button>
            </div>
          </div>
        ))}

        {clientesFiltrados.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <User size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-500 font-medium">Nenhum cliente encontrado.</p>
          </div>
        )}
      </div>

      {/* Modal Novo/Editar Cliente */}
      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={form.id ? "Editar Cliente" : "Novo Cliente"}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">Nome Completo</label>
            <input 
              type="text" className="w-full border-2 border-slate-100 p-3 rounded-2xl focus:border-slate-900 outline-none uppercase"
              value={form.nome} onChange={e => setForm({...form, nome: e.target.value.toUpperCase()})}
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">Telemóvel / WhatsApp</label>
            <input 
              type="text" className="w-full border-2 border-slate-100 p-3 rounded-2xl focus:border-slate-900 outline-none"
              value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})}
              placeholder="(00) 00000-0000"
            />
          </div>
          <button onClick={salvarCliente} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all mt-4">
            Guardar Cliente
          </button>
        </div>
      </Modal>

      {/* Modal Histórico da Cliente */}
      <Modal open={modalHistorico} onClose={() => setModalHistorico(false)} title={`Ficha: ${clienteSelecionado?.nome}`}>
        <div className="mb-6 bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">Total Investido no Salão</p>
            <p className="text-2xl font-black text-emerald-600">{fmt(totalGasto)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">Visitas</p>
            <p className="text-xl font-bold text-emerald-700">{historico.length}</p>
          </div>
        </div>

        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Calendar size={18} className="text-slate-400" /> Últimos Atendimentos
        </h4>
        
        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
          {historico.map((atendimento, i) => (
            <div key={i} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50">
              <div>
                <p className="font-bold text-slate-800">{atendimento.procedimentos?.nome || 'Procedimento apagado'}</p>
                <p className="text-xs text-slate-500">{new Date(atendimento.data + 'T12:00:00').toLocaleDateString('pt-BR')} às {atendimento.horario.slice(0,5)}</p>
              </div>
              <div className="font-bold text-emerald-600">
                {fmt(atendimento.valor_cobrado)}
              </div>
            </div>
          ))}

          {historico.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">Esta cliente ainda não tem serviços registados.</p>
          )}
        </div>
      </Modal>

    </div>
  );
}
