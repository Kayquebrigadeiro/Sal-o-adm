import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Login() {
  const [login, setLogin]       = useState(''); // Aceita username ou email
  const [senha, setSenha]       = useState('');
  const [erro, setErro]         = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');
    setLoading(true);

    try {
      let emailParaLogin = login;

      // Se não tem @, é username - buscar email em logins_gerados
      if (!login.includes('@')) {
        const { data: loginData, error: loginError } = await supabase
          .from('logins_gerados')
          .select('auth_user_id')
          .eq('username', login.toLowerCase())
          .eq('ativo', true)
          .single();

        if (loginError || !loginData) {
          setErro('Usuário não encontrado.');
          setLoading(false);
          return;
        }

        // Buscar email do usuário no auth.users via RPC
        const { data: userData, error: userError } = await supabase.rpc('get_user_email_by_id', {
          user_id: loginData.auth_user_id
        });

        if (userError || !userData) {
          setErro('Erro ao buscar dados do usuário.');
          setLoading(false);
          return;
        }

        emailParaLogin = userData;
      }

      // Fazer login com email
      const { error } = await supabase.auth.signInWithPassword({
        email: emailParaLogin,
        password: senha,
      });

      if (error) {
        setErro('Usuário ou senha incorretos.');
      }
    } catch (err) {
      console.error('Erro no login:', err);
      setErro('Erro ao fazer login. Tente novamente.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8">

        {/* Logo / título */}
        <div className="mb-8 text-center">
          <div className="w-14 h-14 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">✂</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800">Sistema do Salão</h1>
          <p className="text-sm text-gray-500 mt-1">Acesso restrito</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Usuário
            </label>
            <input
              type="text"
              required
              autoFocus
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
              placeholder="seu_usuario ou email@exemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
              placeholder="••••••••"
            />
          </div>

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-800 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          Problemas com acesso? Fale com o suporte.
        </p>
      </div>
    </div>
  );
}
