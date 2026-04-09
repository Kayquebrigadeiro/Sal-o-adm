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
import WizardPrimeiroAcesso from './pages/WizardPrimeiroAcesso';

export default function App() {
  const [sessao, setSessao] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setCarregando(false);
          return;
        }

        setSessao(session);

        const { data, error } = await supabase
          .from('perfis_acesso')
          .select(`salao_id, cargo, saloes(configurado)`)
          .eq('auth_user_id', session.user.id)
          .order('criado_em', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          setPerfil({
            salao_id: data[0].salao_id,
            cargo: data[0].cargo,
            configurado: data[0].saloes?.configurado
          });
        } else if (error) {
          console.error('Erro ao buscar perfil:', error);
        }
      } catch (err) {
        console.error('Erro geral no App:', err);
      } finally {
        setCarregando(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSessao(session);
      if (!session) {
        setPerfil(null);
      } else {
        // Recarrega perfil no login
        const { data } = await supabase
          .from('perfis_acesso')
          .select(`salao_id, cargo, saloes(configurado)`)
          .eq('auth_user_id', session.user.id)
          .order('criado_em', { ascending: false })
          .limit(1);
        
        if (data && data.length > 0) {
          setPerfil({ 
            salao_id: data[0].salao_id, 
            cargo: data[0].cargo, 
            configurado: data[0].saloes?.configurado 
          });
        }
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (carregando) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Carregando sistema...</div>;
  }

  if (!sessao || !perfil) {
    return <Login />;
  }

  const salaoId = perfil?.salao_id;
  const role = perfil?.cargo;
  const configurado = perfil?.configurado;
  const email = sessao.user.email;
  const ctx = { salaoId, role };

  // 1. Rota Isolada do Vendedor
  if (role === 'VENDEDOR') {
    return (
      <BrowserRouter>
        <VendedorApp email={email} userId={sessao.user.id} />
      </BrowserRouter>
    );
  }

  // 2. O BLOQUEIO: Se for proprietária e não configurou o salão, trava ela no Wizard!
  if (role === 'PROPRIETARIO' && configurado === false) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<WizardPrimeiroAcesso salaoId={salaoId} />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // 3. Sistema Normal (Configurado)
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
            <Route path="*" element={<Navigate to="/agenda" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
