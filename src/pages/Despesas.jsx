import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Despesas = () => {
  const [despesas, setDespesas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [novaDespesa, setNovaDespesa] = useState({
    descricao: '',
    valor: '',
    valor_pago: '',
    data_vencimento: new Date().toISOString().split('T')[0],
    tipo: 'PROFISSIONAL'
  });

  useEffect(() => {
    carregarDespesas();
  }, []);

  const carregarDespesas = async () => {
    setLoading(true);
    try {
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
        salao_id: perfil.salao_id,
        descricao: novaDespesa.descricao,
        valor: Number(novaDespesa.valor),
        valor_pago: Number(novaDespesa.valor_pago) || 0,
        data_vencimento: novaDespesa.data_vencimento,
        tipo: novaDespesa.tipo
      }]);

      if (error) throw error;

      alert("Despesa registrada com sucesso!");
      setNovaDespesa({ descricao: '', valor: '', valor_pago: '', data_vencimento: new Date().toISOString().split('T')[0], tipo: 'PROFISSIONAL' });
      carregarDespesas(); 
    } catch (error) {
      alert("Erro ao salvar: " + error.message);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Controle de Despesas</h1>
        <p className="text-gray-500">Separe o dinheiro da empresa do seu dinheiro pessoal.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-1 h-fit">
          <h2 className="text-lg font-bold mb-4">Nova Saída</h2>
          <form onSubmit={salvarDespesa} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Descrição</label>
              <input required type="text" value={novaDespesa.descricao} onChange={e => setNovaDespesa({...novaDespesa, descricao: e.target.value})} className="mt-1 w-full p-2 border rounded-lg" placeholder="Ex: Conta de Luz, Mercado..." />
            </div>

            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700">Valor Total (R$)</label>
                <input required type="number" step="0.01" value={novaDespesa.valor} onChange={e => setNovaDespesa({...novaDespesa, valor: e.target.value})} className="mt-1 w-full p-2 border rounded-lg" placeholder="0.00" />
              </div>
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700">Quanto foi pago (R$)</label>
                <input type="number" step="0.01" value={novaDespesa.valor_pago} onChange={e => setNovaDespesa({...novaDespesa, valor_pago: e.target.value})} className="mt-1 w-full p-2 border rounded-lg" placeholder="0.00" />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700">Data</label>
                <input required type="date" value={novaDespesa.data_vencimento} onChange={e => setNovaDespesa({...novaDespesa, data_vencimento: e.target.value})} className="mt-1 w-full p-2 border rounded-lg" />
              </div>
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700">Tipo de Gasto</label>
                <select value={novaDespesa.tipo} onChange={e => setNovaDespesa({...novaDespesa, tipo: e.target.value})} className="mt-1 w-full p-2 border rounded-lg">
                  <option value="PROFISSIONAL">🏢 Despesa do Salão</option>
                  <option value="PESSOAL">🏠 Gasto Pessoal (Pró-labore)</option>
                </select>
              </div>
            </div>

            <button type="submit" className="w-full py-3 mt-4 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors">
              Registrar Despesa
            </button>
          </form>
        </div>

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
                    <th className="p-3 text-right">Valor Total</th>
                    <th className="p-3 text-right">Pago</th>
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
                      <td className="p-3 text-right text-red-600 font-bold">- R$ {d.valor.toFixed(2)}</td>
                      <td className="p-3 text-right text-emerald-600">R$ {(d.valor_pago || 0).toFixed(2)}</td>
                      <td className="p-3 text-center">
                        {d.valor_pendente <= 0 ? (
                          <span className="text-emerald-500 font-bold">✔️ Quitado</span>
                        ) : (
                          <span className="text-amber-500 font-bold">⏳ Pendente: R$ {d.valor_pendente.toFixed(2)}</span>
                        )}
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

export default Despesas;
