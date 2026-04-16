import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Scissors, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Login() {
  const [login, setLogin]       = useState(''); // Aceita username ou email
  const [senha, setSenha]       = useState('');
  const [erro, setErro]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');
    setLoading(true);

    try {
      let emailParaLogin = login;

      // Se não tem @, é a Proprietária tentando entrar com o Username
      if (!login.includes('@')) {
        // Usamos a nossa nova função segura no banco que tem permissão para ler dados
        const { data: emailDescoberto, error: rpcError } = await supabase.rpc('get_email_from_username', {
          p_username: login
        });

        if (rpcError || !emailDescoberto) {
          setErro('Usuário não encontrado ou inativo.');
          setLoading(false);
          return;
        }
        emailParaLogin = emailDescoberto;
      }

      // Agora fazemos o login real no Supabase com o E-mail
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: emailParaLogin,
        password: senha,
      });

      if (signInError) throw signInError;

      // Sucesso! Recarrega a página para o App.jsx ler a sessão e redirecionar
      window.location.reload();

    } catch (err) {
      // ESTA É A LINHA MÁGICA:
      alert("ERRO SECRETO DO SUPABASE: " + err.message);
      
      console.error('Erro no login:', err);
      setErro('Credenciais inválidas. Verifique o usuário e senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorações de fundo */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[100px] translate-x-1/3 translate-y-1/3" />
      <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-violet-500/5 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2" />

      <div className="bg-white/[0.07] backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-sm p-8 border border-white/10 relative animate-fadeIn">
        {/* Brand micro-shimmer */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className="animate-shimmer absolute inset-0 opacity-10" />
        </div>

        {/* Logo / título */}
        <div className="mb-8 text-center relative">
          <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-rose-500/30 animate-float">
            <Scissors size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Salão Secreto</h1>
          <p className="text-sm text-slate-400 mt-1">Sistema de gestão profissional</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 relative">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              Usuário
            </label>
            <input
              type="text"
              required
              autoFocus
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="w-full bg-white/[0.07] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 transition-all"
              placeholder="seu_usuario ou email@exemplo.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              Senha
            </label>
            <div className="relative">
              <input
                type={mostrarSenha ? 'text' : 'password'}
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full bg-white/[0.07] border border-white/10 rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {erro && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 animate-fadeIn">
              <p className="text-sm text-red-400 font-medium">{erro}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-xl py-3.5 text-sm font-bold hover:from-rose-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2 shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/30 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <p className="text-xs text-slate-500 text-center mt-6">
          Problemas com acesso? Fale com o suporte.
        </p>

        {/* Rodapé sutil */}
        <div className="text-center mt-6 pt-4 border-t border-white/5">
          <p className="text-[10px] text-slate-600 font-medium">Salão Secreto © 2026</p>
        </div>
      </div>
    </div>
  );
}
