import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, ShieldAlert, Eye, EyeOff, Loader2, KeyRound, RefreshCw } from 'lucide-react';

/**
 * Overlay de bloqueio do Dashboard Financeiro.
 * 
 * - Solicita PIN de 4 dígitos para desbloquear
 * - Fluxo "Esqueci meu PIN": valida senha de login via Edge Function → gera novo PIN
 */
export default function DashboardLockOverlay({ onUnlock, salaoId }) {
  // ─── Estado principal: PIN ───
  const [pinInput, setPinInput] = useState('');
  const [erro, setErro] = useState('');

  // ─── Estado: Esqueci meu PIN ───
  const [modoReset, setModoReset] = useState(false);
  const [senhaInput, setSenhaInput] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const [erroReset, setErroReset] = useState('');
  const [novoPinGerado, setNovoPinGerado] = useState(null);

  // ─── Tentar desbloquear com PIN ───
  const handleSubmitPin = (e) => {
    e.preventDefault();
    setErro('');

    if (pinInput.length !== 4) {
      setErro('O PIN deve ter 4 dígitos');
      return;
    }

    const sucesso = onUnlock(pinInput);
    if (!sucesso) {
      setErro('PIN incorreto');
      setPinInput('');
    }
  };

  // ─── Gerar PIN aleatório ───
  const gerarPin = () => {
    return String(Math.floor(1000 + Math.random() * 9000));
  };

  // ─── Esqueci meu PIN: validar senha e gerar novo ───
  const handleResetPin = async (e) => {
    e.preventDefault();
    setErroReset('');
    setLoadingReset(true);

    try {
      if (!senhaInput.trim()) {
        setErroReset('Informe sua senha de login');
        return;
      }

      // Chamar Edge Function para validar senha
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        setErroReset('Sessão expirada. Faça login novamente.');
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/verify-dashboard-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password: senhaInput.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        setErroReset(result.error || 'Erro ao verificar senha');
        return;
      }

      if (!result.authorized) {
        setErroReset('Senha incorreta');
        setSenhaInput('');
        return;
      }

      // Senha válida → gerar novo PIN e salvar
      const novoPin = gerarPin();

      const { error: updateError } = await supabase
        .from('configuracoes')
        .update({ dashboard_pin: novoPin })
        .eq('salao_id', salaoId);

      if (updateError) throw updateError;

      setNovoPinGerado(novoPin);
      setSenhaInput('');

    } catch (err) {
      console.error('Erro no reset de PIN:', err);
      setErroReset('Erro inesperado. Tente novamente.');
    } finally {
      setLoadingReset(false);
    }
  };

  // ─── Após ver o novo PIN, voltar para tela de PIN ───
  const voltarParaPin = () => {
    setModoReset(false);
    setNovoPinGerado(null);
    setSenhaInput('');
    setErroReset('');
    setPinInput('');
    setErro('');
    // Forçar refetch no componente pai ao voltar
    window.location.reload();
  };

  // ────────────────────────────────────────────────────
  // RENDER: Novo PIN gerado com sucesso
  // ────────────────────────────────────────────────────
  if (novoPinGerado) {
    return (
      <div className="w-full min-h-[85vh] rounded-3xl flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 to-blue-800 p-4 shadow-sm my-4">
        <div className="bg-gray-50 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-gray-200 w-full max-w-sm text-center animate-fadeIn">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <RefreshCw size={28} />
          </div>
          <h2 className="text-2xl font-black text-gray-800 mb-2 uppercase">Novo PIN Gerado</h2>
          <p className="text-gray-500 mb-6 text-sm uppercase">Anote seu novo PIN de acesso ao Dashboard</p>

          <div className="bg-white border-2 border-emerald-200 rounded-2xl p-6 mb-6">
            <p className="text-5xl font-black text-emerald-600 tracking-[0.5em] text-center">
              {novoPinGerado}
            </p>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-6">
            <p className="text-xs font-bold text-orange-600 uppercase">
              ⚠️ Memorize este PIN. Ele será solicitado sempre que você acessar o Dashboard.
            </p>
          </div>

          <button
            onClick={voltarParaPin}
            className="w-full bg-gradient-to-r from-sky-500 to-sky-500 text-white py-4 rounded-xl font-bold hover:opacity-90 transition-all shadow-xl uppercase"
          >
            Entendi, Continuar
          </button>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────
  // RENDER: Modo Reset (Esqueci meu PIN)
  // ────────────────────────────────────────────────────
  if (modoReset) {
    return (
      <div className="w-full min-h-[85vh] rounded-3xl flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 to-blue-800 p-4 shadow-sm my-4">
        <div className="bg-gray-50 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-gray-200 w-full max-w-sm text-center animate-fadeIn">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-2xl font-black text-gray-800 mb-2 uppercase">Redefinir PIN</h2>
          <p className="text-gray-500 mb-8 text-sm uppercase">
            Informe sua senha de login para gerar um novo PIN
          </p>

          <form onSubmit={handleResetPin}>
            <div className="relative mb-4">
              <input
                type={mostrarSenha ? 'text' : 'password'}
                placeholder="Senha de Login"
                className="w-full text-center text-lg font-bold bg-gray-50 border border-gray-200 text-gray-800 rounded-xl py-4 pr-12 outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                value={senhaInput}
                onChange={e => setSenhaInput(e.target.value)}
                autoFocus
                disabled={loadingReset}
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {erroReset && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 animate-fadeIn">
                <p className="text-xs font-bold text-red-600 uppercase">{erroReset}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loadingReset}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-500 text-white py-4 rounded-xl font-bold hover:opacity-90 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 uppercase"
            >
              {loadingReset ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Verificando...
                </>
              ) : (
                'Validar e Gerar Novo PIN'
              )}
            </button>
          </form>

          <button
            onClick={() => { setModoReset(false); setErroReset(''); setSenhaInput(''); }}
            className="mt-4 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors uppercase"
          >
            ← Voltar ao PIN
          </button>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────
  // RENDER: Tela de PIN principal
  // ────────────────────────────────────────────────────
  return (
    <div className="w-full min-h-[85vh] rounded-3xl flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 to-blue-800 p-4 shadow-sm my-4">
      <div className="bg-gray-50 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-gray-200 w-full max-w-sm text-center animate-fadeIn">
        <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-sky-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
          <Lock size={28} />
        </div>
        <h2 className="text-2xl font-black text-gray-800 mb-2 uppercase">Painel Financeiro</h2>
        <p className="text-gray-500 mb-8 text-sm uppercase">Acesso restrito à gestão financeira.</p>

        <form onSubmit={handleSubmitPin}>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            placeholder="PIN"
            className="w-full text-center text-4xl tracking-[0.5em] font-black bg-gray-50 border border-gray-200 text-gray-800 rounded-xl py-4 outline-none focus:ring-2 focus:ring-sky-500 mb-4 transition-all"
            value={pinInput}
            onChange={e => {
              const v = e.target.value.replace(/\D/g, '');
              setPinInput(v);
              setErro('');
            }}
            autoFocus
          />

          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 animate-fadeIn">
              <p className="text-xs font-bold text-red-600 uppercase">{erro}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-sky-500 to-sky-500 text-white py-4 rounded-xl font-bold hover:opacity-90 transition-all shadow-xl uppercase"
          >
            Desbloquear
          </button>
        </form>

        <button
          onClick={() => { setModoReset(true); setErro(''); setPinInput(''); }}
          className="mt-6 text-sm font-bold text-gray-500 hover:text-sky-600 transition-colors flex items-center gap-2 mx-auto uppercase"
        >
          <KeyRound size={14} />
          Esqueci meu PIN
        </button>
      </div>
    </div>
  );
}
