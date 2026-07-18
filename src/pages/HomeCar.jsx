import { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import { FinancialEngine } from '../services/FinancialEngine';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { Plus, Pencil, Trash2, TrendingUp, AlertTriangle, User, UserPlus, Phone, Search, PackageOpen } from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtData = (d) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');

export default function HomeCar({ salaoId }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [vendas, setVendas] = useState([]);
  const [mesSelecionado, setMesSelecionado] = useState('');
  const [meses, setMeses] = useState([]);
  
  // Clientes
  const [clientes, setClientes] = useState([]);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [showSugestoes, setShowSugestoes] = useState(false);
  const [modoNovoCliente, setModoNovoCliente] = useState(false);
  const [novoClienteTelefone, setNovoClienteTelefone] = useState('');
  const [salvandoCliente, setSalvandoCliente] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);
  const [vendaEditando, setVendaEditando] = useState(null);
  const [confirmacao, setConfirmacao] = useState(null);
  
  const [form, setForm] = useState({
    data: '',
    cliente: '',
    produto: '',
    custo_produto: '',
    valor_venda: '',
    valor_pago: '',
    obs: ''
  });

  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSugestoes(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [wrapperRef]);

  useEffect(() => {
    const mesesArray = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      mesesArray.push(mes);
    }
    setMeses(mesesArray);
    setMesSelecionado(mesesArray[0]);
  }, []);

  useEffect(() => {
    if (salaoId) {
      carregarClientes();
    }
  }, [salaoId]);

  useEffect(() => {
    if (mesSelecionado && salaoId) {
      carregarVendas();
    }
  }, [mesSelecionado, salaoId]);

  const carregarClientes = async () => {
    try {
      const res = await api.get('/cadastros/clientes');
      if (!res.ok) throw new Error('Erro ao carregar clientes');
      const data = await res.json();
      setClientes(data || []);
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
    }
  };

  const carregarVendas = async () => {
    setLoading(true);
    try {
      const res = await api.get('/cadastros/homecare');
      if (!res.ok) throw new Error('Erro ao carregar vendas');
      const data = await res.json();

      // Filtrar pelo mês selecionado no frontend
      const [ano, mes] = mesSelecionado.split('-');
      const filtradas = (data || []).filter(v => {
        if (!v.data) return false;
        const d = typeof v.data === 'string' ? v.data.slice(0, 7) : '';
        return d === `${ano}-${mes}`;
      }).sort((a, b) => (b.data || '').localeCompare(a.data || ''));

      setVendas(filtradas);
    } catch (error) {
      showToast('Erro ao carregar vendas', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Autocomplete Clientes
  const clientesFiltrados = useMemo(() => {
    if (!buscaCliente.trim()) return [];
    return clientes
      .filter(c => c.nome.toLowerCase().includes(buscaCliente.toLowerCase()))
      .slice(0, 6);
  }, [buscaCliente, clientes]);

  const selecionarCliente = (nome) => {
    setForm(prev => ({ ...prev, cliente: nome }));
    setBuscaCliente(nome);
    setShowSugestoes(false);
  };

  const criarClienteRapido = async () => {
    if (!buscaCliente.trim()) return;
    setSalvandoCliente(true);
    try {
      const res = await api.post('/cadastros/clientes', {
        nome: buscaCliente.trim().toUpperCase(),
        telefone: novoClienteTelefone || null,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao criar cliente');
      }
      const data = await res.json();

      setClientes(prev => [...prev, data].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')));
      setForm(prev => ({ ...prev, cliente: data.nome }));
      setBuscaCliente(data.nome);
      setModoNovoCliente(false);
      setNovoClienteTelefone('');
      setShowSugestoes(false);
      showToast(`✅ CLIENTE ${data.nome} CADASTRADA!`, 'success');
    } catch (err) {
      showToast(`ERRO: ${err.message}`, 'error');
    } finally {
      setSalvandoCliente(false);
    }
  };

  const abrirModal = (venda = null) => {
    if (venda) {
      setVendaEditando(venda);
      setBuscaCliente(venda.cliente);
      setForm({
        data: venda.data,
        cliente: venda.cliente,
        produto: venda.produto,
        custo_produto: venda.custo_produto,
        valor_venda: venda.valor_venda,
        valor_pago: venda.valor_pago,
        obs: venda.obs || ''
      });
    } else {
      setVendaEditando(null);
      setBuscaCliente('');
      setForm({
        data: new Date().toISOString().split('T')[0],
        cliente: '',
        produto: '',
        custo_produto: '',
        valor_venda: '',
        valor_pago: '',
        obs: ''
      });
    }
    setModoNovoCliente(false);
    setShowSugestoes(false);
    setModalAberto(true);
  };

  const salvar = async () => {
    if (!form.cliente || !form.produto || !form.valor_venda) {
      showToast('PREENCHA O CLIENTE, PRODUTO E VENDA!', 'error');
      return;
    }

    try {
      const custo = Number(form.custo_produto || 0);
      const venda = Number(form.valor_venda);
      const pago = Number(form.valor_pago || 0);

      const dados = {
        data: form.data,
        cliente: form.cliente,
        produto: form.produto,
        custo_produto: custo,
        valor_venda: venda,
        valor_pago: pago,
        valor_pendente: venda - pago,
        lucro: venda - custo,
        obs: form.obs
      };

      let res;
      if (vendaEditando) {
        res = await api.put('/cadastros/homecare/' + vendaEditando.id, dados);
      } else {
        res = await api.post('/cadastros/homecare', dados);
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao salvar venda');
      }

      showToast(vendaEditando ? '✅ VENDA ATUALIZADA' : '✅ VENDA REGISTRADA', 'success');
      setModalAberto(false);
      carregarVendas();
    } catch (error) {
      showToast(error.message || 'ERRO AO SALVAR VENDA', 'error');
    }
  };

  const deletar = async (id) => {
    try {
      const res = await api.delete('/cadastros/homecare/' + id);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao deletar');
      }
      showToast('VENDA DELETADA', 'success');
      carregarVendas();
    } catch (error) {
      showToast(error.message || 'ERRO AO DELETAR', 'error');
    }
  };

  const totalVendas = vendas.reduce((acc, v) => acc + Number(v.valor_venda || 0), 0);
  const totalRecebido = vendas.reduce((acc, v) => acc + Number(v.valor_pago || 0), 0);
  const totalLucro = vendas.reduce((acc, v) => acc + Number(v.lucro || 0), 0);
  const totalPendente = vendas.reduce((acc, v) => acc + Number(v.valor_pendente || 0), 0);

  if (loading && !vendas.length) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 animate-fadeIn">
      <PageHeader 
        title="Vendas HomeCare" 
        subtitle="Gerencie os produtos vendidos para uso em casa"
        action={
          <div className="flex items-center gap-3">
            <select
              value={mesSelecionado}
              onChange={e => setMesSelecionado(e.target.value)}
              className="border-2 border-gray-200 rounded-xl px-4 py-2 text-sm bg-white outline-none font-bold text-gray-700 focus:border-emerald-500 transition-colors uppercase"
            >
              {meses.map(m => (
                <option key={m} value={m}>
                  {new Date(m + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </option>
              ))}
            </select>
            <button
              onClick={() => abrirModal()}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200 uppercase tracking-wide text-sm"
            >
              <PackageOpen size={18} /> Nova Venda
            </button>
          </div>
        }
      />

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-gray-400" />
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total Vendas</p>
          </div>
          <p className="text-3xl font-black text-gray-800">{fmt(totalVendas)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-emerald-400" />
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total Recebido</p>
          </div>
          <p className="text-3xl font-black text-emerald-600">{fmt(totalRecebido)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-sky-400" />
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Lucro Total</p>
          </div>
          <p className="text-3xl font-black text-sky-600">{fmt(totalLucro)}</p>
        </div>
        <div className={`rounded-2xl p-5 shadow-sm border ${totalPendente > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            {totalPendente > 0 ? <AlertTriangle size={16} className="text-orange-400" /> : <TrendingUp size={16} className="text-gray-400" />}
            <p className={`text-[10px] font-bold uppercase tracking-widest ${totalPendente > 0 ? 'text-orange-600' : 'text-gray-500'}`}>Pendências</p>
          </div>
          <p className={`text-3xl font-black ${totalPendente > 0 ? 'text-orange-600' : 'text-gray-800'}`}>{fmt(totalPendente)}</p>
        </div>
      </div>

      {/* Lista de Vendas Simplificada */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">Histórico de Vendas</h2>
          <span className="text-xs font-bold text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
            {vendas.length} Registros
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-200">
                <th className="text-left px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Data</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Cliente & Produto</th>
                <th className="text-right px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Lucro Real</th>
                <th className="text-right px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Situação</th>
                <th className="text-center px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody>
              {vendas.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-12">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <PackageOpen size={24} className="text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-bold uppercase text-sm">Nenhuma venda registrada neste mês</p>
                      <p className="text-gray-400 text-xs mt-1">Clique em "Nova Venda" para começar</p>
                    </div>
                  </td>
                </tr>
              ) : (
                vendas.map(venda => (
                  <tr key={venda.id} className="border-b border-gray-100 hover:bg-sky-50/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-bold text-xs">{fmtData(venda.data)}</td>
                    <td className="px-6 py-4">
                      <p className="font-black text-gray-800">{venda.cliente}</p>
                      <p className="text-xs text-gray-500 font-medium uppercase mt-0.5">{venda.produto}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-black text-sky-600 bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-100">
                        {fmt(venda.lucro)}
                      </span>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Custo: {fmt(venda.custo_produto)}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {Number(venda.valor_pendente) > 0 ? (
                        <div>
                          <span className="font-black text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 inline-flex items-center gap-1.5">
                            <AlertTriangle size={12} /> Faltam {fmt(venda.valor_pendente)}
                          </span>
                          <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Valor Venda: {fmt(venda.valor_venda)}</p>
                        </div>
                      ) : (
                        <span className="font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 inline-block">
                          ✅ PAGO
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => abrirModal(venda)} className="p-2 hover:bg-sky-100 text-sky-600 rounded-xl transition-colors" title="Editar Venda">
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setConfirmacao({
                            title: 'DELETAR VENDA',
                            message: 'DELETAR ESTE REGISTRO DE HOMECARE?',
                            confirmLabel: 'DELETAR',
                            tone: 'danger',
                            onConfirm: async () => {
                              setConfirmacao(null);
                              await deletar(venda.id);
                            },
                          })}
                          className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-colors" title="Excluir Venda"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Redesenhado - Passo a Passo Visual */}
      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={vendaEditando ? 'EDITAR VENDA HOMECARE' : 'NOVA VENDA HOMECARE'}>
        <div className="space-y-6">
          
          {/* Sessão 1: Cliente e Data */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-black text-xs">1</div>
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Para quem é a venda?</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 relative" ref={wrapperRef}>
                <label className="block text-[10px] font-black text-gray-500 mb-1.5 uppercase tracking-widest">Buscar Cliente</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="DIGITE O NOME DA CLIENTE..."
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 pl-10 outline-none focus:border-emerald-400 font-bold text-sm uppercase transition-colors"
                    value={buscaCliente}
                    onChange={e => {
                      const val = e.target.value.toUpperCase();
                      setBuscaCliente(val);
                      setForm(prev => ({ ...prev, cliente: val }));
                      setShowSugestoes(true);
                      setModoNovoCliente(false);
                    }}
                    onFocus={() => buscaCliente.trim() && setShowSugestoes(true)}
                  />
                </div>

                {/* Autocomplete Dropdown */}
                {showSugestoes && buscaCliente.trim() && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl z-20 max-h-48 overflow-y-auto">
                    {clientesFiltrados.length > 0 ? (
                      <>
                        {clientesFiltrados.map(c => (
                          <button
                            key={c.id}
                            onClick={() => selecionarCliente(c.nome)}
                            className="w-full text-left px-4 py-3 hover:bg-emerald-50 flex items-center justify-between transition-colors border-b border-gray-100 last:border-0"
                          >
                            <div>
                              <span className="font-bold text-sm text-gray-800">{c.nome}</span>
                              {c.telefone && <span className="text-[10px] text-gray-500 ml-2 bg-gray-100 px-2 py-0.5 rounded-full">{c.telefone}</span>}
                            </div>
                            <User size={14} className="text-gray-400" />
                          </button>
                        ))}
                        <button
                          onClick={() => { setModoNovoCliente(true); setShowSugestoes(false); }}
                          className="w-full text-left px-4 py-3 bg-emerald-50 hover:bg-emerald-100 flex items-center gap-2 text-emerald-700 font-black text-xs border-t border-gray-200 uppercase transition-colors"
                        >
                          <UserPlus size={14} /> Cadastrar nova cliente
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => { setModoNovoCliente(true); setShowSugestoes(false); }}
                        className="w-full text-left px-4 py-4 bg-emerald-50 hover:bg-emerald-100 flex items-center gap-2 text-emerald-700 font-black text-xs uppercase transition-colors"
                      >
                        <UserPlus size={14} /> Cadastrar "{buscaCliente.trim()}"
                      </button>
                    )}
                  </div>
                )}

                {/* Criação Rápida */}
                {modoNovoCliente && (
                  <div className="mt-3 bg-white border-2 border-emerald-200 rounded-xl p-4 shadow-sm animate-fadeIn relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400"></div>
                    <p className="text-[10px] font-black uppercase text-emerald-600 mb-3 flex items-center gap-1.5">
                      <UserPlus size={12} /> Nova cliente: {buscaCliente.trim()}
                    </p>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="WHATSAPP (OPCIONAL)"
                          className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-3 py-2 pl-9 text-xs font-bold outline-none focus:border-emerald-400 transition-colors"
                          value={novoClienteTelefone}
                          onChange={e => setNovoClienteTelefone(e.target.value)}
                        />
                      </div>
                      <button
                        onClick={criarClienteRapido}
                        disabled={salvandoCliente}
                        className="bg-emerald-500 text-white px-5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-gray-500 mb-1.5 uppercase tracking-widest">Data</label>
                <input
                  type="date"
                  value={form.data}
                  onChange={e => setForm({ ...form, data: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 outline-none focus:border-emerald-400 font-bold text-sm text-gray-700 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Sessão 2: Produto */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-black text-xs">2</div>
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">O que foi vendido?</h3>
            </div>
            <div>
              <input
                type="text"
                value={form.produto}
                onChange={e => setForm({ ...form, produto: e.target.value.toUpperCase() })}
                placeholder="EX: MÁSCARA DE HIDRATAÇÃO 250G..."
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-400 font-bold text-sm uppercase transition-colors"
              />
            </div>
          </div>

          {/* Sessão 3: Valores */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-black text-xs">3</div>
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Valores</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-500 mb-1.5 uppercase tracking-widest">Custo do Produto (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">R$</span>
                  <input
                    type="number" step="0.01"
                    value={form.custo_produto}
                    onChange={e => setForm({ ...form, custo_produto: e.target.value })}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 pl-9 outline-none focus:border-emerald-400 font-black text-lg text-gray-700 transition-colors"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 mb-1.5 uppercase tracking-widest">Valor de Venda (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">R$</span>
                  <input
                    type="number" step="0.01"
                    value={form.valor_venda}
                    onChange={e => setForm({ ...form, valor_venda: e.target.value })}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 pl-9 outline-none focus:border-emerald-400 font-black text-lg text-emerald-600 transition-colors bg-emerald-50/30"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 mb-1.5 uppercase tracking-widest">Valor Já Pago (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">R$</span>
                  <input
                    type="number" step="0.01"
                    value={form.valor_pago}
                    onChange={e => setForm({ ...form, valor_pago: e.target.value })}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 pl-9 outline-none focus:border-emerald-400 font-black text-lg text-gray-700 transition-colors"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Preview do Motor */}
            {(form.valor_venda && form.custo_produto) ? (() => {
              const preview = FinancialEngine.calcularHomeCare({
                valorVenda: Number(form.valor_venda) || 0,
                custoProduto: Number(form.custo_produto) || 0,
                valorPago: Number(form.valor_pago) || 0,
              });
              return (
                <div className={`mt-5 rounded-xl p-4 border-2 ${preview.lucro < 0 ? 'bg-red-50 border-red-200' : 'bg-white border-emerald-200 shadow-sm'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    {preview.lucro < 0 ? <AlertTriangle size={16} className="text-red-500" /> : <TrendingUp size={16} className="text-emerald-500" />}
                    <span className="text-xs font-black text-gray-800 uppercase tracking-widest">Seu Lucro Real</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-3xl font-black tracking-tight ${preview.lucro < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {fmt(preview.lucro)}
                      </p>
                      <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Margem: {preview.margemLucro.toFixed(1)}%</p>
                    </div>
                    {preview.pendencia > 0 && (
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Falta Receber</p>
                        <p className="text-xl font-black text-orange-600">{fmt(preview.pendencia)}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })() : null}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setModalAberto(false)}
              className="px-6 py-3 text-gray-500 font-bold uppercase tracking-wider text-xs hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={salvar}
              className="px-8 py-3 bg-emerald-500 text-white rounded-xl font-black uppercase tracking-widest text-sm hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200"
            >
              Confirmar Venda
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!confirmacao}
        title={confirmacao?.title || ''}
        message={confirmacao?.message || ''}
        confirmLabel={confirmacao?.confirmLabel || 'CONFIRMAR'}
        tone={confirmacao?.tone || 'danger'}
        onCancel={() => setConfirmacao(null)}
        onConfirm={confirmacao?.onConfirm || (() => setConfirmacao(null))}
      />
    </div>
  );
}
