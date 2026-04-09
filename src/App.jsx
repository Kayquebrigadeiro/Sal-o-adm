import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Agenda from './pages/Agenda';
import Dashboard from './pages/Dashboard';
import HomeCar from './pages/HomeCar';
import Paralelos from './pages/Paralelos';
import Despesas from './pages/Despesas';
import Configuracoes from './pages/Configuracoes';
import VendedorApp from './vendedor/VendedorApp';

export default function App() {
  const [sessao, setSessao] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    console.log('[App] 🚀 Iniciando...');
    
    // Carregar sessão e perfil
    const init = async () => {
      try {
        // 1. Pegar sessão
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[App] Sessão:', session ? 'Autenticado' : 'Não autenticado');
        
        if (!session) {
          setCarregando(false);
          return;
        }

        setSessao(session);

        // 2. Pegar perfil (usar limit(1) ao invés de single() para evitar erro PGRST116)
        console.log('[App] Buscando perfil para:', session.user.id);
        const { data: perfData, error: perfError } = await supabase
          .from('perfis_acesso')
          .select('cargo, salao_id')
          .eq('auth_user_id', session.user.id)
          .order('criado_em', { ascending: false })
          .limit(1);

        console.log('[App] Resultado:', { perfData, perfError });

        if (perfError) {
          console.error('[App] ❌ Erro ao buscar perfil:', perfError);
          setErro(`Erro: ${perfError.message} (${perfError.code})`);
          setCarregando(false);
          return;
        }

        if (!perfData || perfData.length === 0) {
          console.error('[App] ❌ Perfil não encontrado');
          setErro('Perfil não encontrado no banco de dados');
          setCarregando(false);
          return;
        }

        console.log('[App] ✅ Perfil carregado:', perfData[0]);
        setPerfil(perfData[0]);
        setCarregando(false);

      } catch (err) {
        console.error('[App] ❌ Erro fatal:', err);
        setErro(err.message);
        setCarregando(false);
      }
    };

    init();

    // Listener de mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[App] Auth mudou:', _event);
      if (!session) {
        setSessao(null);
        setPerfil(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Tela de carregamento
  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Tela de erro
  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-4">❌ Erro</h2>
          <p className="text-gray-700 mb-4">{erro}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900"
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }

  // Tela de login
  if (!sessao) {
    return <Login />;
  }

  const role = perfil?.cargo || 'FUNCIONARIO';
  const salaoId = perfil?.salao_id;
  const email = sessao.user.email;
  const ctx = { salaoId, role };

  console.log('[App] Renderizando com role:', role);

  // Painel do vendedor
  if (role === 'VENDEDOR') {
    return (
      <BrowserRouter>
        <VendedorApp email={email} userId={sessao.user.id} />
      </BrowserRouter>
    );
  }

  // Sistema normal (proprietário/funcionário)
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar role={role} email={email} />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/agenda" element={<Agenda {...ctx} />} />
            <Route path="/dashboard" element={role === 'PROPRIETARIO' ? <Dashboard {...ctx} /> : <Navigate to="/agenda" />} />
            <Route path="/homecar" element={role === 'PROPRIETARIO' ? <HomeCar {...ctx} /> : <Navigate to="/agenda" />} />
            <Route path="/paralelos" element={role === 'PROPRIETARIO' ? <Paralelos {...ctx} /> : <Navigate to="/agenda" />} />
            <Route path="/despesas" element={role === 'PROPRIETARIO' ? <Despesas {...ctx} /> : <Navigate to="/agenda" />} />
            <Route path="/configuracoes" element={role === 'PROPRIETARIO' ? <Configuracoes {...ctx} /> : <Navigate to="/agenda" />} />
            <Route path="*" element={<Navigate to={role === 'PROPRIETARIO' ? '/dashboard' : '/agenda'} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
