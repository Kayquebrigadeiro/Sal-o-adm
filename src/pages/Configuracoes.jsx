import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Configuracoes = () => {
  const [config, setConfig] = useState({
    taxa_maquininha_pct: '',
    custo_fixo_por_atendimento: '',
    prolabore_mensal: '',
  });
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarConfigs();
  }, []);

  const carregarConfigs = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: perfil } = await supabase.from('perfis_acesso').select('salao_id').eq('auth_user_id', user.id).single();
      
      if (!perfil) return;

      const { data } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('salao_id', perfil.salao_id)
        .single();

      if (data) setConfig(data);
    } catch (error) {
      console.error("Erro ao carregar configurações", error);
    } finally {
      setLoading(false);
    }
  };

  const salvarConfigs = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: perfil } = await supabase.from('perfis_acesso').select('salao_id').eq('auth_user_id', user.id).single();

      const { error } = await supabase
        .from('configuracoes')
        .update({
          taxa_maquininha_pct: Number(config.taxa_maquininha_pct),
          custo_fixo_por_atendimento: Number(config.custo_fixo_por_atendimento),
          prolabore_mensal: Number(config.prolabore_mensal)
        })
        .eq('salao_id', perfil.salao_id); // Blindagem: Só altera se for o salão dela

      if (error) throw error;
      alert("Configurações atualizadas! O Dashboard foi recalibrado.");
    } catch (error) {
      alert("Erro ao salvar: " + error.message);
    } finally {
      setSalvando(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Carregando painel de controle...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Configurações e Taxas</h1>
        <p className="text-gray-500">Ajuste os valores base que alimentam os gráficos e comissões.</p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-3xl">
        <form onSubmit={salvarConfigs} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <label className="block text-sm font-bold text-blue-900 mb-1">Taxa Média da Maquininha (%)</label>
              <p className="text-xs text-blue-700 mb-3">Isso é descontado antes de calcular o lucro e a comissão.</p>
              <div className="relative">
                <input type="number" step="0.1" value={config.taxa_maquininha_pct} onChange={e => setConfig({...config, taxa_maquininha_pct: e.target.value})} className="w-full p-2 pl-4 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                <span className="absolute right-4 top-2 text-gray-500">%</span>
              </div>
            </div>

            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
              <label className="block text-sm font-bold text-orange-900 mb-1">Custo Fixo por Atendimento (R$)</label>
              <p className="text-xs text-orange-700 mb-3">Rateio de água, luz, aluguel, etc (Ex: R$ 29,00).</p>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">R$</span>
                <input type="number" step="0.01" value={config.custo_fixo_por_atendimento} onChange={e => setConfig({...config, custo_fixo_por_atendimento: e.target.value})} className="w-full p-2 pl-10 border rounded-lg focus:ring-2 focus:ring-orange-500" />
              </div>
            </div>

            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 md:col-span-2">
              <label className="block text-sm font-bold text-purple-900 mb-1">Meta de Pró-labore Mensal (R$)</label>
              <p className="text-xs text-purple-700 mb-3">Quanto você espera retirar para pagar suas contas pessoais.</p>
              <div className="relative w-1/2">
                <span className="absolute left-3 top-2 text-gray-500">R$</span>
                <input type="number" step="0.01" value={config.prolabore_mensal} onChange={e => setConfig({...config, prolabore_mensal: e.target.value})} className="w-full p-2 pl-10 border rounded-lg focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button type="submit" disabled={salvando} className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-md disabled:opacity-50">
              {salvando ? 'Recalibrando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Configuracoes;