import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function VendedorDashboard({ userId }) {
  const [saloes, setSaloes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    carregar();
  }, [userId]);

  const carregar = async () => {
    setLoading(true);
    
    const { data: saloesData } = await supabase
      .from('saloes')
      .select('id, nome, ativo, criado_em')
      .eq('vendedor_id', userId)
      .order('criado_em', { ascending: false });

    if (saloesData) {
      // Buscar contagens para cada salão
      const saloesComDados = await Promise.all(
        saloesData.map(async (salao) => {
          const [{ count: profCount }, { count: procCount }] = await Promise.all([
            supabase.from('profissionais').select('*', { count: 'exact', head: true }).eq('salao_id', salao.id),
            supabase.from('procedimentos').select('*', { count: 'exact', head: true }).eq('salao_id', salao.id),
          ]);
          return { ...salao, profCount: profCount || 0, procCount: procCount || 0 };
        })
      );
      setSaloes(saloesComDados);
    }
    
    setLoading(false);
  };

  if (loading) return <div className="p-8 text-gray-400">Carregando...</div>;

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Painel do Vendedor</h1>
        <p className="text-gray-600">Seus salões cadastrados</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {saloes.map(salao => (
          <div key={salao.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{salao.nome}</h3>
              <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                salao.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {salao.ativo ? '● Ativo' : '○ Inativo'}
              </span>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <p>{salao.profCount} profissional(is)</p>
              <p>{salao.procCount} procedimento(s)</p>
              <p className="text-xs text-gray-400">
                Criado em {new Date(salao.criado_em).toLocaleDateString('pt-BR')}
              </p>
            </div>

            <button
              onClick={() => navigate(`/salao/${salao.id}`)}
              className="w-full bg-gray-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-900 font-medium"
            >
              Gerenciar
            </button>
          </div>
        ))}
      </div>

      {saloes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">Nenhum salão cadastrado ainda</p>
          <button
            onClick={() => navigate('/saloes')}
            className="bg-gray-800 text-white px-6 py-2 rounded-lg hover:bg-gray-900"
          >
            Criar primeiro salão
          </button>
        </div>
      )}
    </div>
  );
}
