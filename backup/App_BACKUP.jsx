import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Agenda from './pages/Agenda';
import VendedorApp from './vendedor/VendedorApp';

// Helper com timeout
const withTimeout = (promise, ms = 15000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout na conexão')), ms)
    )
  ]);
};

const Dashboard     = lazy(() => import('./pages/Dashboard'));
const HomeCar       = lazy(() => import('./pages/HomeCar'));
const Paralelos     = lazy(() => import('./pages/Paralelos'));
const Despesas      = lazy(() => import('./pages/Despesas'));
const Configuracoes = lazy(() => import('./pages/Configuracoes'));

function Carregando() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  const [sessao, setSessao] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        console.log('[App] Iniciando autenticação...');
        
        // Obter sessão com timeout
        const sessionPromise = supabase.auth.getSession();
        const { data: { session }, error: sessionError } = await withTimeout(sessionPromise, 10000);
        
        console.log('[App] Sessão obtida:', session ? 'Autenticado' : 'Não autenticado');
        
        if (!isMounted) return;
        
        if (sessionError) {
          console.error('[App] Erro ao obter sessão:', sessionError);
          setCarregando(false);
          return;
        }

        if (session) {
          setSessao(session);
          console.log('[App] Carregando perfil (BLOQUEADO até sucesso)...');
          
          // BLOQUEIA até carregar o perfil com sucesso
          const perfilCarregado = await carregarPerfilComTentativas(session.user.id);
          
          if (!isMounted) return;
          
          if (perfilCarregado) {
            console.log('[App] ✅ Perfil carregado com sucesso, liberando acesso');
            setPerfil(perfilCarregado);
          } else {
            console.error('[App] ❌ ERRO: Perfil não encontrado e não conseguiu criar');
            // Redireciona para erro ou login novamente
            await supabase.auth.signOut();
            alert('Erro: Seu perfil de acesso não foi encontrado no banco de dados.\n\nContate o administrador do sistema.');
          }
        }
        
        if (isMounted) setCarregando(false);
      } catch (err) {
        console.error('[App] Erro na inicialização:', err.message);
        if (isMounted) {
          setCarregando(false);
        }
      }
    };

    // Helper para carregar perfil COM BLOQUEIO
    const carregarPerfilComTentativas = async (userId) => {
      let tentativas = 0;
      const maxTentativas = 8;

      while (isMounted && tentativas < maxTentativas) {
        try {
          tentativas++;
          console.log(`[App] 🔄 Tentativa ${tentativas}/${maxTentativas} de carregar perfil...`);
          
          console.log(`[App] 🔍 Buscando perfil para userId: ${userId}`);
          
          const { data: perfData, error: perfError } = await withTimeout(
            supabase
              .from('perfis_acesso')
              .select('cargo, salao_id')
              .eq('auth_user_id', userId)
              .single(),
            15000  // Aumentado para 15 segundos
          );
          
          console.log('[App] 📦 Resposta do Supabase:', { perfData, perfError });
          
          if (perfData && isMounted) {
            console.log('[App] ✅ Perfil carregado:', perfData);
            return perfData; // Sucesso!
          }
          
          if (perfError?.code === 'PGRST116') {
            // Nenhum resultado encontrado
            console.error('[App] ❌ PGRST116: Perfil não existe no banco de dados para user:', userId);
            console.error('[App] Dados do erro:', perfError);
            
            if (tentativas >= 3) {
              // Após 3 tentativas de confirmar, assume que realmente não existe
              console.error('[App] Perfil definitivamente não existe. Não continuando tentativas.');
              return null;
            }
            // Tenta novamente em caso de sincronização lenta
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else if (perfError) {
            console.warn(`[App] Erro ao carregar perfil (tentativa ${tentativas}):`, perfError?.message);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (err) {
          console.error(`[App] ❌ Erro detalhado na tentativa ${tentativas}:`, err);
          console.error('[App] Stack trace:', err.stack);
          if (tentativas < maxTentativas) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      console.error('[App] ❌ Esgotado limite de tentativas para carregar perfil');
      return null;
    };

    // Inicializar app
    init();

    // Listener para mudanças de autenticação
    const { data: listener } = supabase.auth.onAuthStateChange(async (_e, session) => {
      console.log('[App] 🔔 Listener: mudança de autenticação detectada', _e);
      
      if (!isMounted) return;
      
      if (session) {
        setSessao(session);
        console.log('[App] Carregando perfil após mudança de auth...');
        const perfilCarregado = await carregarPerfilComTentativas(session.user.id);
        if (isMounted && perfilCarregado) {
          setPerfil(perfilCarregado);
        }
      } else {
        console.log('[App] 🚪 Sessão removida, redirecionando para login');
        setSessao(null);
        setPerfil(null);
      }
    });

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  if (carregando) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col items-center justify-center gap-4 p-4">
        <div className="text-center">
          <div className="inline-block">
            <div className="w-10 h-10 border-3 border-gray-300 border-t-gray-800 rounded-full animate-spin mb-4" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Carregando Dados</h2>
          <p className="text-gray-500 text-sm mb-3">Verificando suas permissões...</p>
          
          <div className="text-xs text-gray-400 space-y-1 bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-w-sm mt-4">
            <p className="text-yellow-700">⚠️ Aguardando carregamento do perfil</p>
            <p className="text-yellow-600 mt-2">Esse passo é necessário para garantir dados corretos</p>
          </div>

          <p className="text-xs text-gray-300 mt-4">Abra o console (F12) para ver detalhes</p>
        </div>
      </div>
    );
  }

  if (!sessao) return <Login />;

  const role = perfil?.cargo || 'FUNCIONARIO';
  const salaoId = perfil?.salao_id;
  const email = sessao.user.email;
  const ctx = { salaoId, role };

  // Se for VENDEDOR, renderiza painel do vendedor
  if (role === 'VENDEDOR') {
    return (
      <BrowserRouter>
        <VendedorApp email={email} userId={sessao.user.id} />
      </BrowserRouter>
    );
  }

  // Para PROPRIETARIO e FUNCIONARIO, renderiza sistema normal
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar role={role} email={email} />
        <main className="flex-1 overflow-auto">
          <Suspense fallback={<Carregando />}>
          <Routes>
            <Route path="/agenda"        element={<Agenda {...ctx} />} />
            <Route path="/dashboard"     element={role === 'PROPRIETARIO' ? <Dashboard {...ctx} /> : <Navigate to="/agenda" />} />
            <Route path="/homecar"       element={role === 'PROPRIETARIO' ? <HomeCar {...ctx} /> : <Navigate to="/agenda" />} />
            <Route path="/paralelos"     element={role === 'PROPRIETARIO' ? <Paralelos {...ctx} /> : <Navigate to="/agenda" />} />
            <Route path="/despesas"      element={role === 'PROPRIETARIO' ? <Despesas {...ctx} /> : <Navigate to="/agenda" />} />
            <Route path="/configuracoes" element={role === 'PROPRIETARIO' ? <Configuracoes {...ctx} /> : <Navigate to="/agenda" />} />
            <Route path="*"              element={<Navigate to={role === 'PROPRIETARIO' ? '/dashboard' : '/agenda'} />} />
          </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
}
