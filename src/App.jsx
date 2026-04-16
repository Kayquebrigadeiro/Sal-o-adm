import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { ToastProvider } from './components/Toast';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Agenda from './pages/Agenda';
import Clientes from './pages/Clientes';
import Dashboard from './pages/Dashboard';
import Precificacao from './pages/Precificacao';
import HomeCar from './pages/HomeCar';
import Paralelos from './pages/Paralelos';
import Despesas from './pages/Despesas';
import Configuracoes from './pages/Configuracoes';
import CatalogoProdutos from './pages/CatalogoProdutos';
import CustosFixos from './pages/CustosFixos';
import VendedorApp from './vendedor/VendedorApp';
import WizardPrimeiroAcesso from './pages/WizardPrimeiroAcesso';

export default function App() {
  const [sessao, setSessao] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [salaoNome, setSalaoNome] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erroCritico, setErroCritico] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setCarregando(false);
          return;
        }

        setSessao(session);

        // Busca o perfil
        const { data, error } = await supabase
          .from('perfis_acesso')
          .select(`salao_id, cargo, saloes(configurado, nome)`)
          .eq('auth_user_id', session.user.id)
          .single();

        if (error) {
          console.error('Erro ao buscar perfil no Supabase:', error);
          setErroCritico(`Erro de Base de Dados: ${error.message}`);
          setCarregando(false);
          return;
        }

        if (data) {
          setPerfil({
            salao_id: data.salao_id,
            cargo: data.cargo,
            configurado: data.saloes?.configurado
          });
          setSalaoNome(data.saloes?.nome || '');
        } else {
          setErroCritico('Perfil não encontrado na tabela perfis_acesso.');
        }
      } catch (err) {
        console.error('Erro geral no App:', err);
        setErroCritico(err.message || 'Ocorreu um erro desconhecido.');
      } finally {
        setCarregando(false);
      }
    };

    init();
  }, []);

  // Ecrã de Erro Crítico (Fim do ecrã branco!)
  if (erroCritico) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-6">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full border border-red-200">
          <h1 className="text-xl font-bold text-red-600 mb-2">Erro de Acesso Detetado</h1>
          <p className="text-sm text-slate-700 mb-4">{erroCritico}</p>
          <button 
            onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }}
            className="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-900"
          >
            Sair e Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  if (carregando) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">A carregar o sistema...</div>;
  }

  if (!sessao || !perfil) {
    return <Login />;
  }

  const salaoId = perfil?.salao_id;
  const role = perfil?.cargo;
  const configurado = perfil?.configurado;
  const email = sessao.user.email;
  const ctx = { salaoId, role };

  // 1. Rota do Administrador / Vendedor
  if (role === 'VENDEDOR') {
    return (
      <BrowserRouter>
        <VendedorApp email={email} userId={sessao.user.id} />
      </BrowserRouter>
    );
  }

  // 2. Trava do Wizard para a Proprietária
  if (role === 'PROPRIETARIO' && configurado === false) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<WizardPrimeiroAcesso salaoId={salaoId} />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // 3. Sistema Normal
  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="flex min-h-screen bg-slate-50">
          <Sidebar role={role} email={email} salaoNome={salaoNome} />
          <main className="flex-1 overflow-auto">
            <div className="animate-fadeIn">
              <Routes>
                <Route path="/agenda" element={<Agenda {...ctx} />} />
                <Route path="/clientes" element={<Clientes {...ctx} />} />
                <Route path="/dashboard" element={role === 'PROPRIETARIO' ? <Dashboard {...ctx} /> : <Navigate to="/agenda" />} />
                <Route path="/precificacao" element={role === 'PROPRIETARIO' ? <Precificacao {...ctx} /> : <Navigate to="/agenda" />} />
                <Route path="/homecar" element={role === 'PROPRIETARIO' ? <HomeCar {...ctx} /> : <Navigate to="/agenda" />} />
                <Route path="/catalogo" element={role === 'PROPRIETARIO' ? <CatalogoProdutos {...ctx} /> : <Navigate to="/agenda" />} />
                <Route path="/custos-fixos" element={role === 'PROPRIETARIO' ? <CustosFixos {...ctx} /> : <Navigate to="/agenda" />} />
                <Route path="/paralelos" element={role === 'PROPRIETARIO' ? <Paralelos {...ctx} /> : <Navigate to="/agenda" />} />
                <Route path="/despesas" element={role === 'PROPRIETARIO' ? <Despesas {...ctx} /> : <Navigate to="/agenda" />} />
                <Route path="/configuracoes" element={role === 'PROPRIETARIO' ? <Configuracoes {...ctx} /> : <Navigate to="/agenda" />} />
                <Route path="*" element={<Navigate to="/agenda" />} />
              </Routes>
            </div>
          </main>
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
}
