import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { Calculator, Settings2, Save, AlertCircle, Percent } from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Precificacao({ salaoId }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  
  // Variáveis Globais (Custo Fixo, Taxa, Margem)
  const [config, setConfig] = useState(null);
  const [procedimentos, setProcedimentos] = useState([]);
  
  // Modal de Edição
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (salaoId) carregarDados();
  }, [salaoId]);

  const carregarDados = async () => {
    setLoading(true);
    const [resConfig, resProc] = await Promise.all([
      supabase.from('configuracoes').select('*').eq('salao_id', salaoId).single(),
      supabase.from('procedimentos').select('*').eq('salao_id', salaoId).order('nome')
    ]);
    setConfig(resConfig.data);
    setProcedimentos(resProc.data || []);
    setLoading(false);
  };

  const salvarConfigGlobais = async () => {
    const { error } = await supabase
      .from('configuracoes')
      .update({
        custo_fixo_por_atendimento: config.custo_fixo_por_atendimento,
        taxa_maquininha_pct: config.taxa_maquininha_pct,
        margem_lucro_desejada_pct: config.margem_lucro_desejada_pct
      })
      .eq('salao_id', salaoId);
      
    if (error) showToast('Erro ao salvar taxas globais', 'error');
    else showToast('Taxas globais atualizadas!', 'success');
  };

  const salvarProcedimento = async () => {
    const { error } = await supabase
      .from('procedimentos')
      .update({
        custo_material_p: form.custo_material_p,
        custo_material_m: form.custo_material_m,
        custo_material_g: form.custo_material_g,
        porcentagem_profissional: form.porcentagem_profissional,
        preco_p: form.preco_p,
        preco_m: form.preco_m,
        preco_g: form.preco_g
      })
      .eq('id', form.id);

    if (error) showToast('Erro ao salvar serviço', 'error');
    else {
      showToast('Serviço atualizado com sucesso!', 'success');
      setModalAberto(false);
      carregarDados();
    }
  };

  // --- MOTOR DE CÁLCULO DA PLANILHA (Tempo Real) ---
  const calcularPrecoIdeal = (custoMaterial) => {
    if (!config || !form) return 0;
    const taxasPct = (Number(config.taxa_maquininha_pct) + Number(form.porcentagem_profissional) + Number(config.margem_lucro_desejada_pct)) / 100;
    
    // Evita divisão por zero ou negativa se as taxas passarem de 100%
    if (taxasPct >= 1) return 0; 
    
    let preco = (Number(config.custo_fixo_por_atendimento) + Number(custoMaterial)) / (1 - taxasPct);
    return Math.ceil(preco / 5) * 5; // Arredonda para o múltiplo de 5 mais próximo (Ex: 142 vira 145)
  };

  if (loading) return <div className="p-6">Carregando motor financeiro...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Calculator className="text-emerald-600" /> Precificação e Custos
        </h1>
        <p className="text-slate-500">Personalize os custos do seu salão, exatamente como na sua planilha.</p>
      </div>

      {/* PAINEL GLOBAL (O Topo da sua Planilha) */}
      <div className="bg-slate-900 rounded-3xl p-6 mb-8 shadow-xl text-white">
        <h3 className="font-bold mb-4 flex items-center gap-2 text-emerald-400">
          <Settings2 size={20} /> Variáveis Globais do Salão
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Custo Fixo por Atendimento (R$)</label>
            <input 
              type="number" step="0.01"
              className="w-full bg-slate-800 border-none rounded-xl p-3 text-white font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
              value={config?.custo_fixo_por_atendimento || ''}
              onChange={e => setConfig({...config, custo_fixo_por_atendimento: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Taxa Média Maquininha (%)</label>
            <input 
              type="number" step="0.1"
              className="w-full bg-slate-800 border-none rounded-xl p-3 text-white font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
              value={config?.taxa_maquininha_pct || ''}
              onChange={e => setConfig({...config, taxa_maquininha_pct: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-emerald-400 uppercase mb-1">Margem de Lucro Desejada (%)</label>
            <input 
              type="number" step="0.1"
              className="w-full bg-emerald-900/50 border border-emerald-500/30 rounded-xl p-3 text-emerald-400 font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
              value={config?.margem_lucro_desejada_pct || ''}
              onChange={e => setConfig({...config, margem_lucro_desejada_pct: e.target.value})}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={salvarConfigGlobais} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all">
            <Save size={16} /> Salvar Taxas
          </button>
        </div>
      </div>

      {/* LISTA DE PROCEDIMENTOS (As linhas da sua Planilha) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
              <th className="p-4 font-bold">Serviço</th>
              <th className="p-4 font-bold text-center">Comissão</th>
              <th className="p-4 font-bold">Custo Produto (M)</th>
              <th className="p-4 font-bold">Preço Atual (M)</th>
              <th className="p-4 font-bold text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {procedimentos.map(proc => (
              <tr key={proc.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="p-4 font-bold text-slate-800">{proc.nome}</td>
                <td className="p-4 text-center">
                  <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-sm font-bold">{proc.porcentagem_profissional}%</span>
                </td>
                <td className="p-4 text-slate-600 font-medium">{fmt(proc.custo_material_m || proc.custo_variavel)}</td>
                <td className="p-4 text-emerald-600 font-bold">{fmt(proc.preco_m || proc.preco_p)}</td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => { setForm(proc); setModalAberto(true); }}
                    className="text-sm bg-slate-900 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-800"
                  >
                    Personalizar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* O SIMULADOR DE MARKUP (Onde a mágica da planilha acontece) */}
      {form && (
        <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={`Personalizar: ${form.nome}`}>
          <div className="space-y-6">
            
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-4">
              <Percent size={24} className="text-blue-500" />
              <div>
                <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Comissão do Profissional neste serviço (%)</label>
                <input 
                  type="number"
                  className="w-32 border-none rounded-lg p-2 font-bold text-blue-900 outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.porcentagem_profissional}
                  onChange={e => setForm({...form, porcentagem_profissional: e.target.value})}
                />
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 grid grid-cols-3 gap-4 text-xs font-bold text-slate-500 uppercase text-center">
                <div>Tamanho P</div>
                <div>Tamanho M</div>
                <div>Tamanho G</div>
              </div>
              
              <div className="p-4 grid grid-cols-3 gap-4">
                {/* TAMANHO P */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Custo Produto (R$)</label>
                    <input type="number" step="0.01" className="w-full border rounded-lg p-2 text-sm font-bold" value={form.custo_material_p || 0} onChange={e => setForm({...form, custo_material_p: e.target.value})} />
                  </div>
                  <div className="bg-emerald-50 p-2 rounded-lg">
                    <p className="text-[10px] text-emerald-800 uppercase font-bold">Preço Ideal</p>
                    <p className="font-black text-emerald-600">{fmt(calcularPrecoIdeal(form.custo_material_p))}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Preço Cobrado (R$)</label>
                    <input type="number" step="0.01" className="w-full border-2 border-slate-800 rounded-lg p-2 text-sm font-bold" value={form.preco_p || 0} onChange={e => setForm({...form, preco_p: e.target.value})} />
                  </div>
                </div>

                {/* TAMANHO M */}
                <div className="space-y-3 border-x px-4">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Custo Produto (R$)</label>
                    <input type="number" step="0.01" className="w-full border rounded-lg p-2 text-sm font-bold" value={form.custo_material_m || 0} onChange={e => setForm({...form, custo_material_m: e.target.value})} />
                  </div>
                  <div className="bg-emerald-50 p-2 rounded-lg">
                    <p className="text-[10px] text-emerald-800 uppercase font-bold">Preço Ideal</p>
                    <p className="font-black text-emerald-600">{fmt(calcularPrecoIdeal(form.custo_material_m))}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Preço Cobrado (R$)</label>
                    <input type="number" step="0.01" className="w-full border-2 border-slate-800 rounded-lg p-2 text-sm font-bold" value={form.preco_m || 0} onChange={e => setForm({...form, preco_m: e.target.value})} />
                  </div>
                </div>

                {/* TAMANHO G */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Custo Produto (R$)</label>
                    <input type="number" step="0.01" className="w-full border rounded-lg p-2 text-sm font-bold" value={form.custo_material_g || 0} onChange={e => setForm({...form, custo_material_g: e.target.value})} />
                  </div>
                  <div className="bg-emerald-50 p-2 rounded-lg">
                    <p className="text-[10px] text-emerald-800 uppercase font-bold">Preço Ideal</p>
                    <p className="font-black text-emerald-600">{fmt(calcularPrecoIdeal(form.custo_material_g))}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Preço Cobrado (R$)</label>
                    <input type="number" step="0.01" className="w-full border-2 border-slate-800 rounded-lg p-2 text-sm font-bold" value={form.preco_g || 0} onChange={e => setForm({...form, preco_g: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>

            {(Number(config?.taxa_maquininha_pct) + Number(form.porcentagem_profissional) + Number(config?.margem_lucro_desejada_pct)) >= 100 && (
              <div className="p-3 bg-red-50 text-red-700 text-sm font-bold rounded-xl flex items-center gap-2">
                <AlertCircle size={18} /> As taxas (Comissão + Maquininha + Sua Margem) somam 100% ou mais. É impossível ter lucro assim!
              </div>
            )}

            <button onClick={salvarProcedimento} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 mt-4">
              Salvar Configurações do Serviço
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
