import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function MeusSaloes({ userId }) {
  const [saloes, setSaloes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { carregar(); }, [userId]);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('saloes')
      .select(`
        *,
        profissionais(count),
        procedimentos(count)
      `)
      .eq('vendedor_id', userId)
      .is('deletado_em', null)
      .order('criado_em', { ascending: false });

    if (error) {
      console.error('Erro ao carregar salões:', error);
    } else {
      setSaloes(data || []);
    }
    setLoading(false);
  };

  const deletar = async (id, nome) => {
    if (!confirm(`Deletar "${nome}" permanentemente?\n\nTodos os dados serão apagados: profissionais, atendimentos, financeiro. Esta ação não pode ser desfeita.`)) return;
    
    const { error } = await supabase.rpc('fn_deletar_salao', { p_salao_id: id });

    if (error) {
      alert('Erro ao deletar: ' + error.message);
      return;
    }
    carregar();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-4 h-4 border-2 border-sky-300 border-t-sky-600 rounded-full animate-spin" />
          Carregando...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Meus Salões</h1>
        <button
          onClick={() => navigate('/admin/novo-salao')}
          className="bg-sky-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-sky-600">
          + Novo Salão
        </button>
      </div>

      {saloes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm mb-4">Nenhum salão cadastrado ainda.</p>
          <button
            onClick={() => navigate('/admin/novo-salao')}
            className="bg-sky-500 text-white text-sm px-6 py-2 rounded-lg hover:bg-sky-600">
            Cadastrar primeiro salão
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {saloes.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h2 className="font-semibold text-gray-800">{s.nome}</h2>
                  {s.telefone && <p className="text-xs text-gray-400 mt-0.5">{s.telefone}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  s.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {s.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="flex gap-4 text-xs text-gray-500 mb-4">
                <span>{s.profissionais?.[0]?.count || 0} profissionais</span>
                <span>{s.procedimentos?.[0]?.count || 0} procedimentos</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/admin/salao/${s.id}`)}
                  className="flex-1 text-center text-xs border border-sky-200 text-sky-600 rounded-lg py-1.5 hover:bg-sky-50 font-medium">
                  Gerenciar
                </button>
                <button
                  onClick={() => deletar(s.id, s.nome)}
                  className="text-xs border border-red-200 text-red-600 rounded-lg px-3 py-1.5 hover:bg-red-50">
                  Deletar
                </button>
              </div>
            </div>
          ))}</div>
      )}
    </div>
  );
}
