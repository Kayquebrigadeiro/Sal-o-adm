import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { Plus, Edit2, Trash2, ShieldCheck, Users, AlertCircle, Copy, MessageCircle, CreditCard } from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Configuracoes({ salaoId, role }) {
  const { showToast } = useToast();
  const [profissionais, setProfissionais] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Abas
  const [abaAtiva, setAbaAtiva] = useState('equipe'); // 'equipe' | 'plano'

  // Modal Profissionais
  const [modalProf, setModalProf] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({
    nome: '',
    cargo: 'FUNCIONARIO',
    salario_fixo: '',
    ativo: true
  });

  // Assinatura
  const [assinatura, setAssinatura] = useState(null);
  const [loadingAssinatura, setLoadingAssinatura] = useState(false);
  const [erroAssinatura, setErroAssinatura] = useState(null);
  const [modalPix, setModalPix] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // Variáveis PIX (.env)
  const chavePix = import.meta.env.VITE_PIX_CHAVE;
  const nomePix  = import.meta.env.VITE_PIX_NOME;
  const wpp      = import.meta.env.VITE_WHATSAPP_SUPORTE;
  const pixCopiaCola = import.meta.env.VITE_PIX_COPIA_COLA;

  useEffect(() => {
    if (salaoId) carregarProfissionais(true);
  }, [salaoId]);

  useEffect(() => {
    if (abaAtiva === 'plano' && !assinatura && salaoId) {
      carregarAssinatura();
    }
  }, [abaAtiva, salaoId]);

  const carregarAssinatura = async () => {
    setLoadingAssinatura(true);
    setErroAssinatura(null);
    try {
      const { data, error } = await supabase.rpc('verificar_acesso_salao', { p_salao_id: salaoId });
      if (error) throw error;
      setAssinatura(data);
    } catch (err) {
      console.error(err);
      setErroAssinatura('Não foi possível carregar as informações do plano no momento.');
    } finally {
      setLoadingAssinatura(false);
    }
  };

  const copiarChave = () => {
    navigator.clipboard.writeText(pixCopiaCola || chavePix);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const carregarProfissionais = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    const { data } = await supabase
      .from('profissionais')
      .select('id, nome, cargo, salario_fixo')
      .eq('salao_id', salaoId)
      .eq('ativo', true)
      .order('nome');
    setProfissionais(data || []);
    if (isInitial) setLoading(false);
  };

  const salvarProfissional = async () => {
    if (!form.nome) return showToast('O NOME É OBRIGATÓRIO', 'error');

    const dadosSalvar = {
      ...form,
      salao_id: salaoId,
      salario_fixo: Number(form.salario_fixo || 0),
      ativo: true
    };

    let error;
    if (editando) {
      const { error: err } = await supabase.from('profissionais').update(dadosSalvar).eq('id', editando.id).eq('salao_id', salaoId);
      error = err;
    } else {
      const { error: err } = await supabase.from('profissionais').upsert([dadosSalvar], { onConflict: 'salao_id,nome' });
      error = err;
    }

    if (error) showToast('ERRO AO SALVAR', 'error');
    else {
      showToast('PROFISSIONAL SALVO COM SUCESSO!', 'success');
      setModalProf(false);
      carregarProfissionais();
    }
  };

  const deletarProfissional = async (id) => {
    if (!window.confirm('REMOVER ESTE PROFISSIONAL DA EQUIPE?')) return;
    try {
      await supabase.from('profissionais').update({ ativo: false }).eq('id', id).eq('salao_id', salaoId);
      showToast('PROFISSIONAL REMOVIDO', 'success');
      carregarProfissionais();
    } catch (err) {
      showToast('ERRO AO REMOVER', 'error');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fadeIn">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">Configurações</h1>
          <p className="text-blue-500 uppercase">Gerencie a equipe e sua assinatura.</p>
        </div>
        {abaAtiva === 'equipe' && (
          <button
            onClick={() => { setEditando(null); setForm({ nome: '', cargo: 'FUNCIONARIO', salario_fixo: '', ativo: true }); setModalProf(true); }}
            className="bg-blue-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-800 transition-all shadow-lg shadow-blue-200 uppercase text-sm"
          >
            <Plus size={18} /> Novo Profissional
          </button>
        )}
      </div>

      {role === 'PROPRIETARIO' && (
        <div className="flex gap-4 mb-8 border-b border-blue-700 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setAbaAtiva('equipe')}
            className={`px-4 py-3 font-bold uppercase transition-all whitespace-nowrap border-b-2 text-sm ${abaAtiva === 'equipe' ? 'border-blue-900 text-white' : 'border-transparent text-blue-400 hover:text-blue-200 hover:bg-blue-950'}`}
          >
            Equipe & Parceiros
          </button>
          {/* DESATIVADO TEMPORARIAMENTE
          <button
            onClick={() => setAbaAtiva('plano')}
            className={`px-4 py-3 font-bold uppercase transition-all whitespace-nowrap border-b-2 text-sm ${abaAtiva === 'plano' ? 'border-blue-900 text-white' : 'border-transparent text-blue-400 hover:text-blue-200 hover:bg-blue-950'}`}
          >
            Meu Plano
          </button>
          */}
        </div>
      )}

      {/* ABA EQUIPE */}
      {abaAtiva === 'equipe' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
        {profissionais.map(prof => (
          <div key={prof.id} className="bg-blue-900 p-5 rounded-3xl border border-blue-800 shadow-sm flex items-center justify-between group hover:border-blue-300 transition-all">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${prof.cargo === 'PROPRIETARIO' ? 'bg-blue-900 text-white' : 'bg-blue-100 text-blue-200'}`}>
                {prof.nome.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-white flex items-center gap-2">
                  {prof.nome}
                  {prof.cargo === 'PROPRIETARIO' && <ShieldCheck size={14} className="text-blue-500" title="Proprietário" />}
                </h3>
                <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">
                  {prof.cargo} • {prof.salario_fixo > 0 ? `Fixo: ${fmt(prof.salario_fixo)}` : 'Apenas Comissão'}
                </p>
              </div>
            </div>

            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => { setEditando(prof); setForm(prof); setModalProf(true); }}
                className="p-2 hover:bg-blue-800 rounded-xl text-blue-400 hover:text-blue-200"
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={() => deletarProfissional(prof.id)}
                className="p-2 hover:bg-red-50 rounded-xl text-red-400 hover:text-red-600"
                title="Remover Profissional"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* MODAL DE CADASTRO/EDIÇÃO */}
      <Modal open={modalProf} onClose={() => setModalProf(false)} title={editando ? "EDITAR PROFISSIONAL" : "NOVO PROFISSIONAL"}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-blue-100 mb-1 block uppercase">Nome Completo</label>
            <input
              type="text" className="w-full border-2 border-blue-800 p-3 rounded-2xl focus:border-blue-900 outline-none transition-all"
              value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value.toUpperCase() })}
              placeholder="EX: MARIA SILVA"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-blue-100 mb-1 block uppercase">Cargo / Papel</label>
              <select
                className="w-full border-2 border-blue-800 p-3 rounded-2xl focus:border-blue-900 outline-none uppercase"
                value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })}
              >
                <option value="FUNCIONARIO">COLABORADOR</option>
                <option value="PROPRIETARIO">SÓCIO / PROPRIETÁRIO</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-bold text-blue-100 mb-1 block uppercase">Salário Fixo (Opcional)</label>
              <div className="relative">
                <span className="absolute left-3 top-3.5 text-blue-400 text-sm">R$</span>
                <input
                  type="number" className="w-full border-2 border-blue-800 p-3 pl-10 rounded-2xl focus:border-blue-900 outline-none"
                  value={form.salario_fixo} onChange={e => setForm({ ...form, salario_fixo: e.target.value })}
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 uppercase">
            <div className="flex gap-3">
              <Users className="text-blue-500" size={20} />
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>Nota:</strong> A comissão deste profissional é definida por <strong>procedimento</strong> na aba de Serviços. Isso permite que ele ganhe 50% em cortes e 30% em químicas, por exemplo.
              </p>
            </div>
          </div>

          <button
            onClick={salvarProfissional}
            className="w-full bg-blue-900 text-white py-4 rounded-2xl font-bold hover:bg-blue-800 transition-all shadow-lg shadow-blue-200 mt-4 uppercase"
          >
            {editando ? "Salvar Alterações" : "Cadastrar na Equipe"}
          </button>
        </div>
      </Modal>

      {/* ABA MEU PLANO */}
      {abaAtiva === 'plano' && role === 'PROPRIETARIO' && (
        <div className="bg-blue-900 rounded-3xl border border-blue-700 p-8 shadow-sm max-w-2xl mx-auto animate-fadeIn">
          <h2 className="text-xl font-black text-white uppercase mb-8 flex items-center gap-3">
            <ShieldCheck className="text-blue-400" size={24} /> Meu Plano Atual
          </h2>
          
          {loadingAssinatura ? (
            <div className="flex items-center justify-center py-12">
               <span className="animate-spin w-8 h-8 border-4 border-blue-700 border-t-blue-900 rounded-full"></span>
            </div>
          ) : erroAssinatura ? (
            <div className="bg-red-50 border border-red-100 text-red-600 p-6 rounded-2xl font-bold uppercase text-sm text-center flex flex-col items-center gap-2">
              <AlertCircle size={24} className="text-red-400" />
              {erroAssinatura}
            </div>
          ) : assinatura ? (
            <div className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-950 p-5 rounded-2xl border border-blue-800">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Status da Conta</p>
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 ${
                        assinatura.status === 'TRIAL' ? 'bg-blue-100 text-blue-700' :
                        (assinatura.status === 'ATIVA' || assinatura.status === 'ATIVO') && assinatura.dias_restantes > 5 ? 'bg-emerald-100 text-emerald-700' :
                        (assinatura.status === 'ATIVA' || assinatura.status === 'ATIVO') && assinatura.dias_restantes <= 5 ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                    }`}>
                      {assinatura.status === 'TRIAL' ? 'TRIAL (TESTE)' : (assinatura.status === 'ATIVA' || assinatura.status === 'ATIVO') && assinatura.dias_restantes <= 5 ? '⚠️ VENCENDO' : assinatura.status === 'ATIVA' ? 'ATIVO' : assinatura.status}
                    </span>
                  </div>
                  <div className="bg-blue-950 p-5 rounded-2xl border border-blue-800">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Valor do Plano</p>
                    <p className="font-black text-white text-lg">{fmt(100)} <span className="text-xs font-bold text-blue-400 uppercase">/ mês</span></p>
                  </div>
                  <div className="bg-blue-950 p-5 rounded-2xl border border-blue-800">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Vencimento</p>
                    <p className="font-bold text-white text-lg">
                      {new Date(assinatura.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="bg-blue-950 p-5 rounded-2xl border border-blue-800">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Dias Restantes</p>
                    <p className={`font-black text-lg ${assinatura.dias_restantes < 0 ? 'text-blue-600' : 'text-white'}`}>
                      {assinatura.dias_restantes < 0 ? 'VENCIDO' : `${assinatura.dias_restantes} DIAS`}
                    </p>
                  </div>
               </div>

               <button 
                 onClick={() => setModalPix(true)}
                 className="w-full mt-6 bg-blue-900 text-white py-4 rounded-2xl font-black uppercase text-sm hover:bg-blue-800 transition-all shadow-xl shadow-blue-900/10 flex items-center justify-center gap-2"
               >
                 <CreditCard size={18} /> Renovar Agora
               </button>
            </div>
          ) : null}
        </div>
      )}

      {/* MODAL PIX */}
      <Modal open={modalPix} onClose={() => setModalPix(false)} title="RENOVAR MEU PLANO">
        <div className="space-y-6">
           <div className="text-center p-6 bg-blue-950 rounded-2xl border border-blue-800">
             <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Assinatura Mensal</p>
             <p className="text-4xl font-black text-emerald-600">{fmt(100)}</p>
           </div>
           
           <div>
             <p className="text-xs font-black text-blue-200 uppercase tracking-widest mb-3">Pague via PIX:</p>
             
             {pixCopiaCola && (
               <div className="flex flex-col items-center justify-center p-4 bg-blue-900 rounded-2xl border-2 border-blue-700 mb-4 shadow-sm animate-fadeIn">
                 <img 
                   src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCopiaCola)}`}
                   alt="QR Code PIX"
                   className="w-40 h-40 sm:w-48 sm:h-48 rounded-xl shadow-sm border border-blue-800"
                 />
                 <p className="text-[10px] font-black text-blue-400 uppercase mt-4 tracking-widest">Escaneie com o app do banco</p>
               </div>
             )}

             <div className="bg-blue-900 border-2 border-blue-700 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
               <div className="text-center sm:text-left overflow-hidden w-full">
                 <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{pixCopiaCola ? 'PIX Copia e Cola' : 'Chave PIX'}</p>
                 <p className="font-bold text-white text-sm tracking-wider truncate w-full" title={pixCopiaCola || chavePix}>
                   {pixCopiaCola || chavePix}
                 </p>
                 {nomePix && <p className="text-xs font-bold text-blue-500 uppercase mt-0.5">{nomePix}</p>}
               </div>
               <button 
                 onClick={copiarChave}
                 className="w-full sm:w-auto bg-blue-100 text-blue-100 px-5 py-3 rounded-xl text-xs font-black uppercase hover:bg-blue-200 transition-colors flex items-center justify-center gap-2 whitespace-nowrap flex-shrink-0"
               >
                 <Copy size={14} /> {copiado ? 'COPIADO!' : 'COPIAR CÓDIGO'}
               </button>
             </div>
           </div>

           <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3">
             <ShieldCheck size={20} className="text-emerald-500 flex-shrink-0 mt-0.5" />
             <p className="text-xs font-bold text-emerald-700 leading-relaxed uppercase">
               Após realizar o pagamento, seu acesso será renovado no sistema em até 1 hora. O vendedor responsável confirmará a transação.
             </p>
           </div>

           <div className="pt-4 border-t border-blue-800 flex flex-col items-center">
             <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Dúvidas? Fale com o suporte</p>
             <a 
               href={`https://wa.me/55${wpp?.replace(/\D/g, '')}`} 
               target="_blank" 
               rel="noreferrer"
               className="inline-flex items-center gap-2 bg-blue-900 text-white px-8 py-3 rounded-xl font-bold text-xs hover:bg-blue-800 transition-all shadow-md uppercase tracking-wider"
             >
               <MessageCircle size={16} /> Falar no WhatsApp
             </a>
           </div>
        </div>
      </Modal>
    </div>
  );
}
