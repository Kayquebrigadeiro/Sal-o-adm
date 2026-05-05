import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Scissors, Eye, EyeOff, Loader2, User, Lock, ArrowRight } from 'lucide-react';

export default function Login() {
  const [login, setLogin] = useState(''); // Aceita username ou email
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');
    setLoading(true);

    try {
      let emailParaLogin = login;

      // Se não tem @, é a tentativa de entrar com o Username
      if (!login.includes('@')) {
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

      // Login real no Supabase com o E-mail
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: emailParaLogin,
        password: senha,
      });

      if (signInError) throw signInError;

      // Sucesso! Não precisamos recarregar a página. 
      // O App.jsx tem um listener (onAuthStateChange) que vai detectar o SIGNED_IN
      // e atualizar a tela automaticamente.

    } catch (err) {
      console.error('Erro no login:', err);
      setErro('Credenciais inválidas. Verifique os dados inseridos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-50 flex flex-col items-center justify-center p-4 sm:p-8 font-sans relative overflow-hidden">

      {/* Background patterns and gradients */}
      <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-sky-200/30 rounded-full blur-[120px] -z-10" />
      <div className="absolute top-[10%] -left-[10%] w-[40%] h-[40%] bg-sky-100/40 rounded-full blur-[100px] -z-10" />

      {/* Main Login Card */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 w-full max-w-[420px] overflow-hidden">

        {/* Header Section */}
        <div className="bg-sky-500 p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none" />

          <div className="w-16 h-16 bg-white/20 border border-white/30 rounded-2xl flex items-center justify-center mx-auto mb-5 backdrop-blur-sm shadow-xl relative z-10">
            <Scissors size={28} className="text-white" />
          </div>

          <h1 className="text-2xl font-black text-white tracking-tight relative z-10 uppercase">Salão Secreto</h1>
          <p className="text-sky-100 text-sm mt-2 font-medium relative z-10 uppercase">Acesso ao Painel de Gestão</p>
        </div>

        {/* Form Section */}
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                Usuário ou E-mail
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User size={18} className="text-gray-400 group-focus-within:text-sky-500 transition-colors" />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white transition-all font-medium"
                  placeholder="USUARIO_ADMIN"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                Senha
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-400 group-focus-within:text-sky-500 transition-colors" />
                </div>
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-12 py-3.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white transition-all font-medium"
                  placeholder="********"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-0 inset-y-0 px-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {erro && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl animate-fadeIn">
                <p className="text-sm text-red-700 font-semibold uppercase">{erro}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-500 text-white rounded-xl py-4 text-sm font-bold hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-6 shadow-md hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  AUTENTICANDO...
                </>
              ) : (
                <>
                  ENTRAR NO SISTEMA
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Section */}
        <div className="bg-gray-50 px-8 py-5 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400 font-medium">
            SALÃO SECRETO © {new Date().getFullYear()}
          </p>
          <a href="#" className="text-xs text-sky-500 font-bold hover:text-sky-600 transition-colors uppercase">
            SUPORTE TÉCNICO
          </a>
        </div>
      </div>

      {/* Informational badges (optional, for aesthetics) */}
      <div className="mt-10 flex items-center gap-6 text-sm text-gray-400 font-medium uppercase">
        <span className="flex items-center gap-2">
          <Lock size={14} /> Conexão Segura
        </span>
        <span className="w-1 h-1 bg-gray-300 rounded-full" />
        <span>GESTÃO INTELIGENTE</span>
      </div>

    </div>
  );
}
