import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { CreditCard, AlertTriangle, LogOut, Copy, CheckCircle2, MessageCircle } from 'lucide-react';
import { useToast } from '../components/Toast';

export default function TelaAssinaturaVencida({ salaoNome, dataVencimento, diasRestantes, valorPlano }) {
  const { addToast } = useToast();
  const [modalPixAberto, setModalPixAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const chavePix = import.meta.env.VITE_PIX_CHAVE;
  const nomePix = import.meta.env.VITE_PIX_NOME;
  const wppSuporte = import.meta.env.VITE_WHATSAPP_SUPORTE;

  const dataFormatada = dataVencimento ? new Date(dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '--/--/----';

  const handleSair = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const copiarPix = () => {
    navigator.clipboard.writeText(chavePix);
    setCopiado(true);
    addToast('Chave PIX copiada!', 'success');
    setTimeout(() => setCopiado(false), 2000);
  };

  const abrirWhatsApp = () => {
    const msg = encodeURIComponent(`Olá! Gostaria de renovar minha assinatura do Salão Secreto (${salaoNome}) via Cartão de Crédito.`);
    window.open(`https://wa.me/55${wppSuporte}?text=${msg}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/[0.05] border border-white/10 backdrop-blur-xl p-8 rounded-2xl shadow-2xl max-w-md w-full relative overflow-hidden">
        
        {/* Efeito luminoso de fundo */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center">
          
          <div className="w-16 h-16 bg-rose-500/20 rounded-2xl flex items-center justify-center mb-6 border border-rose-500/30">
            <AlertTriangle className="w-8 h-8 text-rose-400" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Assinatura Inativa</h1>
          <p className="text-slate-300 text-sm mb-8 leading-relaxed">
            Seu acesso ao <strong>{salaoNome}</strong> está temporariamente suspenso.
          </p>

          <div className="w-full bg-slate-900/50 rounded-xl p-4 mb-8 border border-white/5 text-left">
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-400 text-sm">Plano Atual</span>
              <span className="text-white font-medium">R$ {Number(valorPlano || 100).toFixed(2).replace('.', ',')}/mês</span>
            </div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-400 text-sm">Vencimento</span>
              <span className="text-rose-400 font-medium">{dataFormatada}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Status</span>
              <span className="bg-rose-500/20 text-rose-400 text-xs px-2 py-1 rounded-md font-medium border border-rose-500/20">
                BLOQUEADO
              </span>
            </div>
          </div>

          <p className="text-slate-400 text-sm mb-4">Escolha como deseja renovar:</p>

          <div className="grid grid-cols-2 gap-3 w-full mb-8">
            <button 
              onClick={() => setModalPixAberto(true)}
              className="flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white p-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
            >
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M6.864 10.963a1.442 1.442 0 1 0 0-2.885 1.442 1.442 0 0 0 0 2.885m8.887 2.073a1.442 1.442 0 1 1-2.884 0 1.442 1.442 0 0 1 2.884 0M12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12m-6.309-8.49L2.83 12l2.86-3.51a4.298 4.298 0 0 1 3.328-1.57h5.964A4.298 4.298 0 0 1 18.31 8.49L21.17 12l-2.86 3.51a4.298 4.298 0 0 1-3.328 1.57H9.018a4.298 4.298 0 0 1-3.327-1.57"/></svg>
              </div>
              <span className="text-sm font-semibold">PIX</span>
            </button>
            <button 
              onClick={abrirWhatsApp}
              className="flex flex-col items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white p-4 rounded-xl transition-all border border-white/5"
            >
              <CreditCard className="w-6 h-6 text-slate-300" />
              <span className="text-sm font-semibold">Cartão</span>
            </button>
          </div>

          <div className="w-full border-t border-white/10 pt-6">
            <button 
              onClick={handleSair}
              className="flex items-center justify-center gap-2 w-full text-slate-400 hover:text-white transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sair da conta
            </button>
          </div>

        </div>
      </div>

      {/* MODAL PIX */}
      {modalPixAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden transform transition-all">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-emerald-400"><path d="M6.864 10.963a1.442 1.442 0 1 0 0-2.885 1.442 1.442 0 0 0 0 2.885m8.887 2.073a1.442 1.442 0 1 1-2.884 0 1.442 1.442 0 0 1 2.884 0M12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12m-6.309-8.49L2.83 12l2.86-3.51a4.298 4.298 0 0 1 3.328-1.57h5.964A4.298 4.298 0 0 1 18.31 8.49L21.17 12l-2.86 3.51a4.298 4.298 0 0 1-3.328 1.57H9.018a4.298 4.298 0 0 1-3.327-1.57"/></svg>
                  Pagamento via PIX
                </h3>
                <button onClick={() => setModalPixAberto(false)} className="text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 text-center">
                  <span className="block text-slate-400 text-xs mb-1">Valor da Renovação</span>
                  <span className="block text-2xl font-bold text-white">R$ {Number(valorPlano || 100).toFixed(2).replace('.', ',')}</span>
                </div>

                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <span className="block text-slate-400 text-xs mb-1">Recebedor</span>
                  <span className="block text-sm text-white font-medium">{nomePix}</span>
                </div>

                <div>
                  <span className="block text-slate-400 text-xs mb-2">Chave PIX (Celular/CPF/Email/Aleatória)</span>
                  <button 
                    onClick={copiarPix}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${copiado ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                  >
                    <span className="font-mono text-sm truncate mr-2">{chavePix}</span>
                    {copiado ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <Copy className="w-5 h-5 flex-shrink-0" />}
                  </button>
                </div>
              </div>

              <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                <MessageCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-200/70 leading-relaxed">
                  Após realizar o pagamento, envie o comprovante no WhatsApp do suporte para <strong>liberação imediata</strong>.
                </p>
              </div>

            </div>
            
            <div className="p-4 border-t border-slate-700 bg-slate-800/50">
              <button 
                onClick={() => {
                  setModalPixAberto(false);
                  abrirWhatsApp();
                }}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 rounded-xl transition-colors text-sm"
              >
                Enviar Comprovante
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
