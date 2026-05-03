import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import { Search, CreditCard, ShieldAlert, CalendarClock, CheckCircle } from 'lucide-react';

export default function Assinaturas() {
  const { addToast } = useToast();
  const [saloes, setSaloes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  
  // Modal de Renovação
  const [modalAberto, setModalAberto] = useState(false);
  const [salaoSelecionado, setSalaoSelecionado] = useState(null);
  const [renovacaoForm, setRenovacaoForm] = useState({
    forma_pagamento: 'PIX',
    valor: 100.00,
    referencia: '',
    obs: ''
  });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarAssinaturas();
  }, []);

  const carregarAssinaturas = async () => {
    setCarregando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('saloes')
        .select(`
          id, nome, ativo,
          assinaturas (
            id, status, proximo_vencimento,
            planos ( valor_mensal )
          )
        `)
        .eq('vendedor_id', user.id)
        .order('nome');

      if (error) throw error;

      // Calcular dias restantes no frontend para exibição rápida
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const formatado = data.map(s => {
        // Como 'assinaturas' é uma relação 1:1, a query retorna array com 1 item ou objeto.
        const ass = Array.isArray(s.assinaturas) ? s.assinaturas[0] : s.assinaturas;
        let dias = 0;
        if (ass?.proximo_vencimento) {
          const venc = new Date(ass.proximo_vencimento + 'T00:00:00');
          dias = Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24));
        }
        
        return {
          ...s,
          assinatura: ass || null,
          diasRestantes: dias
        };
      });

      setSaloes(formatado);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setCarregando(false);
    }
  };

  const handleRenovar = async (e) => {
    e.preventDefault();
    if (!salaoSelecionado) return;
    setSalvando(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ass = salaoSelecionado.assinatura;

      // 1. Calcular novas datas
      const dataVencimentoAtual = new Date(ass.proximo_vencimento + 'T00:00:00');
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      // Se vencido, renova a partir de hoje. Se ainda ativo, soma 30 dias na data atual.
      const dataBase = dataVencimentoAtual < hoje ? hoje : dataVencimentoAtual;
      
      const novaDataFim = new Date(dataBase);
      novaDataFim.setDate(novaDataFim.getDate() + 30);
      const strDataFim = novaDataFim.toISOString().split('T')[0];

      // 2. Inserir em pagamentos_assinatura
      const { error: pgError } = await supabase
        .from('pagamentos_assinatura')
        .insert({
          salao_id: salaoSelecionado.id,
          assinatura_id: ass.id,
          valor: renovacaoForm.valor,
          metodo: renovacaoForm.forma_pagamento,
          pago: true,
          pago_em: new Date().toISOString(),
          referencia_mes: strDataFim
        });

      if (pgError) throw pgError;

      // 3. Atualizar assinatura
      const { error: assError } = await supabase
        .from('assinaturas')
        .update({
          status: 'ATIVA',
          proximo_vencimento: strDataFim
        })
        .eq('id', ass.id);

      if (assError) throw assError;

      addToast('Assinatura renovada com sucesso!', 'success');
      setModalAberto(false);
      carregarAssinaturas();

    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSalvando(false);
    }
  };

  const abrirModal = (salao) => {
    setSalaoSelecionado(salao);
    setRenovacaoForm({
      forma_pagamento: 'PIX',
      valor: salao.assinatura?.planos?.valor_mensal || 100.00,
      referencia: '',
      obs: ''
    });
    setModalAberto(true);
  };

  const filtered = saloes.filter(s => s.nome.toLowerCase().includes(busca.toLowerCase()));

  const qtAtivos = saloes.filter(s => s.assinatura?.status === 'ATIVA').length;
  const qtVencidos = saloes.filter(s => ['SUSPENSA', 'EXPIRADA'].includes(s.assinatura?.status) || s.diasRestantes < 0).length;
  const qtTrial = saloes.filter(s => s.assinatura?.status === 'TRIAL').length;

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fadeIn">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Assinaturas</h1>
          <p className="text-slate-500 mt-1">Controle de pagamentos e acessos dos seus salões.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Ativos</p>
            <p className="text-2xl font-bold text-slate-800">{qtAtivos}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Vencidos / Bloqueados</p>
            <p className="text-2xl font-bold text-slate-800">{qtVencidos}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Em Trial (Teste)</p>
            <p className="text-2xl font-bold text-slate-800">{qtTrial}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar salão..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-sm border-b border-slate-200">
                <th className="py-4 px-6 font-semibold">Salão</th>
                <th className="py-4 px-6 font-semibold">Status</th>
                <th className="py-4 px-6 font-semibold">Vencimento</th>
                <th className="py-4 px-6 font-semibold">Plano</th>
                <th className="py-4 px-6 font-semibold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {carregando ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400">Carregando assinaturas...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400">Nenhum salão encontrado.</td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const ass = s.assinatura;
                  if (!ass) return null; // Fallback caso script SQL não tenha rodado
                  
                  const isVencido = ['SUSPENSA', 'EXPIRADA'].includes(ass.status) || s.diasRestantes < 0;
                  const dVenc = new Date(ass.proximo_vencimento + 'T00:00:00').toLocaleDateString('pt-BR');

                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6 font-medium text-slate-800">{s.nome}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                          isVencido ? 'bg-rose-50 text-rose-600 border-rose-200' :
                          ass.status === 'ATIVA' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                          'bg-amber-50 text-amber-600 border-amber-200'
                        }`}>
                          {isVencido ? 'VENCIDA' : ass.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm">
                        <span className="block text-slate-700">{dVenc}</span>
                        <span className={`text-xs font-medium ${s.diasRestantes < 0 ? 'text-rose-500' : s.diasRestantes <= 5 ? 'text-amber-500' : 'text-slate-400'}`}>
                          {s.diasRestantes < 0 ? `Venceu há ${Math.abs(s.diasRestantes)} dias` : `Em ${s.diasRestantes} dias`}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-600 font-medium">
                        R$ {Number(ass.planos?.valor_mensal || 100).toFixed(2).replace('.', ',')}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => abrirModal(s)}
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${
                            isVencido || s.diasRestantes <= 5
                              ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
                              : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {isVencido ? 'Liberar Acesso' : 'Renovar'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE RENOVAÇÃO */}
      {modalAberto && salaoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Renovar Assinatura</h3>
                <p className="text-sm text-slate-500">{salaoSelecionado.nome}</p>
              </div>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleRenovar} className="p-6 space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Forma de Pagamento</label>
                <select 
                  value={renovacaoForm.forma_pagamento}
                  onChange={(e) => setRenovacaoForm({...renovacaoForm, forma_pagamento: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="PIX">PIX</option>
                  <option value="CARTAO">Cartão de Crédito</option>
                  <option value="CORTESIA">Cortesia / Isento</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor Recebido (R$)</label>
                <input 
                  type="number" step="0.01" min="0" required
                  value={renovacaoForm.valor}
                  onChange={(e) => setRenovacaoForm({...renovacaoForm, valor: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Referência / Comprovante (opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ex: ID da transação PIX"
                  value={renovacaoForm.referencia}
                  onChange={(e) => setRenovacaoForm({...renovacaoForm, referencia: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observações internas</label>
                <textarea 
                  rows="2"
                  value={renovacaoForm.obs}
                  onChange={(e) => setRenovacaoForm({...renovacaoForm, obs: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setModalAberto(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={salvando}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {salvando ? 'Salvando...' : 'Confirmar Renovação'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
