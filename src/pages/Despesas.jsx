import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Despesas = () => {
  const [despesas, setDespesas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estado do formulário
  const [novaDespesa, setNovaDespesa] = useState({
    descricao: '',
    valor: '',
    data_vencimento: new Date().toISOString().split('T')[0],
    tipo: 'PROFISSIONAL', // ou PESSOAL
    paga: true
  });

  useEffect(() => {
    carregarDespesas();
  }, []);

  const carregarDespesas = async () => {
    setLoading(true);
    try {
      // BLINDAGEM SAAS: Pega o Salão do usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      const { data: perfil } = await supabase.from('perfis_acesso').select('salao_id').eq('auth_user_id', user.id).single();
      
      if (!perfil) return;

      const { data } = await supabase
        .from('despesas')
        .select('*')
        .eq('salao_id', perfil.salao_id)
        .order('data_vencimento', { ascending: false })
        .limit(20);

      setDespesas(data || []);
    } catch (error) {
      console.error("Erro ao carregar despesas", error);
    } finally {
      setLoading(false);
    }
  };

  const salvarDespesa = async (e) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: perfil } = await supabase.from('perfis_acesso').select('salao_id').eq('auth_user_id', user.id).single();

      const { error } = await supabase.from('despesas').insert([{
        salao_id: perfil.salao_id, // Garante que vai pro salão certo
        descricao: novaDespesa.descricao,
        valor: Number(novaDespesa.valor),
        data_vencimento: novaDespesa.data_vencimento,
        tipo: novaDespesa.tipo,
        paga: novaDespesa.paga
      }]);

      if (error) throw error;

      alert("Despesa registrada com sucesso!");
      setNovaDespesa({ ...novaDespesa, descricao: '', valor: '' });
      carregarDespesas(); // Atualiza a lista
    } catch (error) {
      alert("Erro ao salvar: " + error.message);
    }
  };

  const formatarBRL = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Controle de Despesas</h1>
        <p className="text-gray-500">Separe o dinheiro da empresa do seu dinheiro pessoal.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Formulário de Nova Despesa */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-1 h-fit">
          <h2 className="text-lg font-bold mb-4">Nova Saída</h2>
          <form onSubmit={salvarDespesa} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Descrição</label>
              <input required type="text" value={novaDespesa.descricao} onChange={e => setNovaDespesa({...novaDespesa, descricao: e.target.value})} className="mt-1 w-full p-2 border rounded-lg" placeholder="Ex: Conta de Luz, Mercado..." />
            </div>

            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700">Valor (R$)</label>
                <input required type="number" step="0.01" value={novaDespesa.valor} onChange={e => setNovaDespesa({...novaDespesa, valor: e.target.value})} className="mt-1 w-full p-2 border rounded-lg" placeholder="0.00" />
              </div>
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700">Data</label>
                <input required type="date" value={novaDespesa.data_vencimento} onChange={e => setNovaDespesa({...novaDespesa, data_vencimento: e.target.value})} className="mt-1 w-full p-2 border rounded-lg" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo de Gasto</label>
              <select value={novaDespesa.tipo} onChange={e => setNovaDespesa({...novaDespesa, tipo: e.target.value})} className="mt-1 w-full p-2 border rounded-lg">
                <option value="PROFISSIONAL">🏢 Despesa do Salão</option>
                <option value="PESSOAL">🏠 Gasto Pessoal (Pró-labore)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <input type="checkbox" id="paga" checked={novaDespesa.paga} onChange={e => setNovaDespesa({...novaDespesa, paga: e.target.checked})} className="w-4 h-4 text-emerald-600 rounded" />
              <label htmlFor="paga" className="text-sm font-medium text-gray-700">Já está pago</label>
            </div>

            <button type="submit" className="w-full py-3 mt-4 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors">
              Registrar Despesa
            </button>
          </form>
        </div>

        {/* Lista de Últimas Despesas */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
          <h2 className="text-lg font-bold mb-4">Últimas Movimentações</h2>
          {loading ? <p>Carregando...</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-3 rounded-tl-lg">Data</th>
                    <th className="p-3">Descrição</th>
                    <th className="p-3">Categoria</th>
                    <th className="p-3 text-right">Valor</th>
                    <th className="p-3 text-center rounded-tr-lg">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {despesas.map(d => (
                    <tr key={d.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{new Date(d.data_vencimento).toLocaleDateString('pt-BR')}</td>
                      <td className="p-3 font-medium">{d.descricao}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 text-xs rounded-full font-bold ${d.tipo === 'PESSOAL' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                          {d.tipo}
                        </span>
                      </td>
                      <td className="p-3 text-right text-red-600 font-bold">- {formatarBRL(d.valor)}</td>
                      <td className="p-3 text-center">
                        {d.paga ? <span className="text-emerald-500">✔️ Pago</span> : <span className="text-amber-500">⏳ Pendente</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Despesas;import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function fmt(val) {
  return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function toISO(date) {
  const y = date.getFullYear(), m = String(date.getMonth()+1).padStart(2,'0'), d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}

const TIPOS = ['ALUGUEL','ENERGIA','AGUA','INTERNET','MATERIAL','EQUIPAMENTO','FORNECEDOR','FUNCIONARIO','OUTRO'];
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const vazio = { data: toISO(new Date()), descricao: '', tipo: 'OUTRO', valor: '', pago: false };

export default function Despesas({ salaoId }) {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(vazio);
  const [salvando, setSalvando] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('');

  useEffect(() => { if (salaoId) carregar(); }, [salaoId, ano, mes]);

  const inicioMes = `${ano}-${String(mes).padStart(2,'0')}-01`;
  const fimMes = mes === 12 ? `${ano+1}-01-01` : `${ano}-${String(mes+1).padStart(2,'0')}-01`;

  const carregar = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('despesas')
      .select('*')
      .eq('salao_id', salaoId)
      .gte('data', inicioMes)
      .lt('data', fimMes)
      .order('data', { ascending: false });
    setLista(data || []);
    setLoading(false);
  };

  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    const { error } = await supabase.from('despesas').insert([{ ...form, salao_id: salaoId, valor: Number(form.valor) }]);
    setSalvando(false);
    if (error) { alert('Erro: ' + error.message); return; }
    setModal(false);
    setForm(vazio);
    carregar();
  };

  const togglePago = async (id, pago) => {
    setLista(l => l.map(i => i.id === id ? { ...i, pago: !pago } : i));
    await supabase.from('despesas').update({ pago: !pago }).eq('id', id);
    carregar();
  };

  const listagem = filtroTipo ? lista.filter(i => i.tipo === filtroTipo) : lista;
  const totalGeral = lista.reduce((s, i) => s + Number(i.valor || 0), 0);
  const totalPago = lista.filter(i => i.pago).reduce((s, i) => s + Number(i.valor || 0), 0);
  const totalAberto = lista.filter(i => !i.pago).reduce((s, i) => s + Number(i.valor || 0), 0);

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Despesas</h1>
        <div className="flex gap-2 ml-auto">
          <select value={mes} onChange={e => setMes(Number(e.target.value))} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
            {MESES.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={ano} onChange={e => setAno(Number(e.target.value))} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
            {[2023,2024,2025,2026].map(a => <option key={a}>{a}</option>)}
          </select>
          <button onClick={() => { setForm(vazio); setModal(true); }} className="bg-gray-800 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-gray-900">
            + Nova despesa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-xs text-gray-500">Total do mês</p><p className="text-lg font-semibold text-gray-800">{fmt(totalGeral)}</p></div>
        <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-xs text-gray-500">Pagas</p><p className="text-lg font-semibold text-green-700">{fmt(totalPago)}</p></div>
        <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-xs text-gray-500">Em aberto</p><p className="text-lg font-semibold text-red-600">{fmt(totalAberto)}</p></div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFiltroTipo('')} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${!filtroTipo ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
          Todos
        </button>
        {TIPOS.map(t => (
          <button key={t} onClick={() => setFiltroTipo(t === filtroTipo ? '' : t)} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filtroTipo === t ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? <p className="p-6 text-sm text-gray-400">Carregando...</p> :
         listagem.length === 0 ? <p className="p-6 text-sm text-gray-400">Nenhuma despesa neste mês.</p> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Data','Descrição','Tipo','Valor','Status',''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-medium">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {listagem.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-xs">{item.data}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{item.descricao}</td>
                  <td className="px-4 py-3"><span className="text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5">{item.tipo}</span></td>
                  <td className="px-4 py-3 font-medium text-red-600">{fmt(item.valor)}</td>
                  <td className="px-4 py-3">
                    {item.pago
                      ? <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Paga</span>
                      : <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Em aberto</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => togglePago(item.id, item.pago)} className="text-xs border border-gray-200 rounded px-2 py-1 hover:bg-gray-50">
                      {item.pago ? 'Desfazer' : 'Marcar paga'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Nova despesa</h2>
            <form onSubmit={salvar} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-600 block mb-1">Data</label><input type="date" required value={form.data} onChange={e => setForm({...form, data: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-600 block mb-1">Valor (R$)</label><input type="number" step="0.01" required value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
              </div>
              <div><label className="text-xs text-gray-600 block mb-1">Descrição</label><input type="text" required value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-xs text-gray-600 block mb-1">Tipo</label>
                <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {TIPOS.map(t => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.pago} onChange={e => setForm({...form, pago: e.target.checked})} className="rounded" />
                Já foi paga
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="flex-1 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={salvando} className="flex-1 py-2.5 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50">{salvando ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
