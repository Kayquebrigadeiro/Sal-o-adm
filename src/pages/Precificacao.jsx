import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { Calculator, Settings2, Save, AlertCircle, Percent, Plus, Trash2 } from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Precificacao({ salaoId }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  
  const [config, setConfig] = useState(null);
  const [procedimentos, setProcedimentos] = useState([]);
  
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (salaoId) carregarDados();
  }, [salaoId]);

  const carregarDados = async () => {
    setLoading(true);
    const [resConfig, resProc] = await Promise.all([
      supabase.from('configuracoes').select('*').eq('salao_id', salaoId).single(),
      supabase.from('procedimentos').select('*').eq('salao_id', salaoId).eq('ativo', true).order('nome')
    ]);
    setConfig(resConfig.data);
    setProcedimentos(resProc.data || []);
    setLoading(false);
  };

  const abrirNovo = () => {
    setForm({
      nome: '',
      categoria: 'CABELO',
      requer_comprimento: true,
      porcentagem_profissional: 40,
      custo_material_p: 0, custo_material_m: 0, custo_material_g: 0,
      preco_p: 0, preco_m: 0, preco_g: 0
    });
    setModalAberto(true);
  };

  const salvarProcedimento = async () => {
    if (!form.nome) return showToast('Nome é obrigatório', 'error');

    const payload = { ...form, salao_id: salaoId };
    let error;

    if (form.id) {
      const { error: err } = await supabase.from('procedimentos').update(payload).eq('id', form.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('procedimentos').insert([payload]);
      error = err;
    }

    if (error) showToast('Erro ao salvar', 'error');
    else {
      showToast('Procedimento salvo!', 'success');
      setModalAberto(false);
      carregarDados();
    }
  };

  const deletarProcedimento = async (id) => {
    if (!confirm('Deseja desativar este procedimento?')) return;
    const { error } = await supabase.from('procedimentos').update({ ativo: false }).eq('id', id);
    if (!error) carregarDados();
  };

  const calcularPrecoIdeal = (custoMaterial) => {
    if (!config || !form) return 0;
    const taxasPct = (Number(config.taxa_maquininha_pct || 0) + Number(form.porcentagem_profissional || 0) + Number(config.margem_lucro_desejada_pct || 0)) / 100;
    if (taxasPct >= 1) return 0; 
    let preco = (Number(config.custo_fixo_por_atendimento || 0) + Number(custoMaterial || 0)) / (1 - taxasPct);
    return Math.ceil(preco / 5) * 5; 
  };

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fadeIn">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Calculator className="text-emerald-600" /> Precificação Inteligente
          </h1>
          <p className="text-slate-500">Ajuste seus custos e margens para garantir o lucro real.</p>
        </div>
        <button onClick={abrirNovo} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
          <Plus size={20} /> Novo Procedimento
        </button>
      </div>

      {/* PAINEL GLOBAL */}
      <div className="bg-slate-900 rounded-3xl p-6 mb-8 shadow-xl text-white">
        <h3 className="font-bold mb-4 flex items-center gap-2 text-emerald-400">
          <Settings2 size={20} /> Taxas Globais (Impactam todos os preços)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800 p-4 rounded-2xl">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Custo Fixo / Atendimento</label>
            <input type="number" className="bg-transparent text-2xl font-black outline-none w-full" value={config?.custo_fixo_por_atendimento || ''} onChange={e => setConfig({...config, custo_fixo_por_atendimento: e.target.value})} />
            <p className="text-[10px] text-slate-500 mt-1">Luz, Aluguel, Sistema, etc.</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-2xl">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Taxa Maquininha (%)</label>
            <input type="number" className="bg-transparent text-2xl font-black outline-none w-full" value={config?.taxa_maquininha_pct || ''} onChange={e => setConfig({...config, taxa_maquininha_pct: e.target.value})} />
          </div>
          <div className="bg-emerald-900/30 border border-emerald-500/20 p-4 rounded-2xl">
            <label className="block text-[10px] font-bold text-emerald-400 uppercase mb-2">Margem de Lucro Alvo (%)</label>
            <input type="number" className="bg-transparent text-2xl font-black text-emerald-400 outline-none w-full" value={config?.margem_lucro_desejada_pct || ''} onChange={e => setConfig({...config, margem_lucro_desejada_pct: e.target.value})} />
          </div>
        </div>
      </div>

      {/* LISTA DE SERVIÇOS */}
      <div className="grid grid-cols-1 gap-3">
        {procedimentos.map(proc => (
          <div key={proc.id} className="bg-white border border-slate-200 p-5 rounded-3xl flex items-center justify-between group hover:shadow-md transition-all">
            <div className="flex items-center gap-6">
               <div className="bg-slate-50 p-3 rounded-2xl text-slate-400 group-hover:text-emerald-500 transition-colors">
                 <Calculator size={24} />
               </div>
               <div>
                 <h4 className="font-bold text-slate-900">{proc.nome}</h4>
                 <div className="flex gap-4 mt-1">
                   <p className="text-xs font-bold text-slate-400 uppercase">Comissão: <span className="text-slate-600">{proc.porcentagem_profissional}%</span></p>
                   <p className="text-xs font-bold text-slate-400 uppercase">Preço (M): <span className="text-emerald-600 font-black">{fmt(proc.preco_m)}</span></p>
                 </div>
               </div>
            </div>
            <div className="flex gap-2">
               <button onClick={() => { setForm(proc); setModalAberto(true); }} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200">Editar Custos</button>
               <button onClick={() => deletarProcedimento(proc.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL EDITAR/NOVO */}
      {form && (
        <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={form.id ? `Ajustar: ${form.nome}` : "Novo Procedimento"}>
          <div className="space-y-5">
            {!form.id && (
              <input type="text" placeholder="Nome do Serviço (ex: Hidratação Ouro)" className="text-xl font-bold w-full border-b-2 outline-none py-2 focus:border-emerald-500 uppercase" value={form.nome} onChange={e => setForm({...form, nome: e.target.value.toUpperCase()})} />
            )}
            
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl">
               <span className="text-sm font-bold text-blue-800">Comissão do Profissional (%)</span>
               <input type="number" className="w-20 p-2 rounded-xl font-black text-center outline-none" value={form.porcentagem_profissional} onChange={e => setForm({...form, porcentagem_profissional: e.target.value})} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {['P', 'M', 'G'].map(t => (
                <div key={t} className="p-4 border border-slate-100 rounded-2xl bg-slate-50/50">
                  <p className="text-center font-black text-slate-300 mb-3">CABELO {t}</p>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Custo Produto</label>
                  <input type="number" className="w-full font-bold mb-4 border-b bg-transparent" value={form[`custo_material_${t.toLowerCase()}`]} onChange={e => setForm({...form, [`custo_material_${t.toLowerCase()}`]: e.target.value})} />
                  
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase">Ideal Planilha</p>
                    <p className="text-lg font-black text-emerald-600">{fmt(calcularPrecoIdeal(form[`custo_material_${t.toLowerCase()}`]))}</p>
                  </div>

                  <label className="text-[10px] font-bold text-slate-400 uppercase">Preço Final</label>
                  <input type="number" className="w-full font-black text-slate-900 border-b-2 border-slate-900 bg-transparent text-lg" value={form[`preco_${t.toLowerCase()}`]} onChange={e => setForm({...form, [`preco_${t.toLowerCase()}`]: e.target.value})} />
                </div>
              ))}
            </div>

            <button onClick={salvarProcedimento} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-lg">Salvar Configurações</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
