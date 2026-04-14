import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { Plus, User, DollarSign, Trash2, Edit2, ShieldCheck, Users } from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Configuracoes({ salaoId }) {
  const { showToast } = useToast();
  const [profissionais, setProfissionais] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [modalProf, setModalProf] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({
    nome: '',
    cargo: 'FUNCIONARIO',
    salario_fixo: '',
    ativo: true
  });

  useEffect(() => {
    if (salaoId) carregarProfissionais();
  }, [salaoId]);

  const carregarProfissionais = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profissionais')
      .select('*')
      .eq('salao_id', salaoId)
      .order('nome');
    setProfissionais(data || []);
    setLoading(false);
  };

  const salvarProfissional = async () => {
    if (!form.nome) return showToast('O nome é obrigatório', 'error');

    const dadosSalvar = {
      ...form,
      salao_id: salaoId,
      salario_fixo: Number(form.salario_fixo || 0)
    };

    let error;
    if (editando) {
      const { error: err } = await supabase.from('profissionais').update(dadosSalvar).eq('id', editando.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('profissionais').insert([dadosSalvar]);
      error = err;
    }

    if (error) showToast('Erro ao salvar', 'error');
    else {
      showToast('Profissional salvo com sucesso!', 'success');
      setModalProf(false);
      carregarProfissionais();
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fadeIn">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Equipe & Parceiros</h1>
          <p className="text-slate-500">Gerencie quem faz o salão acontecer.</p>
        </div>
        <button 
          onClick={() => { setEditando(null); setForm({ nome: '', cargo: 'FUNCIONARIO', salario_fixo: '', ativo: true }); setModalProf(true); }}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all"
        >
          <Plus size={20} /> Adicionar Profissional
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {profissionais.map(prof => (
          <div key={prof.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-slate-300 transition-all">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${prof.cargo === 'PROPRIETARIO' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {prof.nome.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  {prof.nome}
                  {prof.cargo === 'PROPRIETARIO' && <ShieldCheck size={14} className="text-blue-500" title="Proprietário" />}
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {prof.cargo} • {prof.salario_fixo > 0 ? `Fixo: ${fmt(prof.salario_fixo)}` : 'Apenas Comissão'}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => { setEditando(prof); setForm(prof); setModalProf(true); }}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <Edit2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE CADASTRO/EDIÇÃO */}
      <Modal open={modalProf} onClose={() => setModalProf(false)} title={editando ? "Editar Profissional" : "Novo Profissional"}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">Nome Completo</label>
            <input 
              type="text" className="w-full border-2 border-slate-100 p-3 rounded-2xl focus:border-slate-900 outline-none transition-all uppercase"
              value={form.nome} onChange={e => setForm({...form, nome: e.target.value.toUpperCase()})}
              placeholder="Ex: Maria Silva"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-slate-700 mb-1 block">Cargo / Papel</label>
              <select 
                className="w-full border-2 border-slate-100 p-3 rounded-2xl focus:border-slate-900 outline-none"
                value={form.cargo} onChange={e => setForm({...form, cargo: e.target.value})}
              >
                <option value="FUNCIONARIO">Colaborador</option>
                <option value="PROPRIETARIO">Sócio / Proprietário</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700 mb-1 block">Salário Fixo (Opcional)</label>
              <div className="relative">
                <span className="absolute left-3 top-3.5 text-slate-400 text-sm">R$</span>
                <input 
                  type="number" className="w-full border-2 border-slate-100 p-3 pl-10 rounded-2xl focus:border-slate-900 outline-none"
                  value={form.salario_fixo} onChange={e => setForm({...form, salario_fixo: e.target.value})}
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
             <div className="flex gap-3">
               <Users className="text-blue-500" size={20} />
               <p className="text-xs text-blue-700 leading-relaxed">
                 <strong>Nota:</strong> A comissão deste profissional é definida por <strong>procedimento</strong> na aba de Serviços. Isso permite que ele ganhe 50% em cortes e 30% em químicas, por exemplo.
               </p>
             </div>
          </div>

          <button 
            onClick={salvarProfissional}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 mt-4"
          >
            {editando ? "Salvar Alterações" : "Cadastrar na Equipe"}
          </button>
        </div>
      </Modal>
    </div>
  );
}