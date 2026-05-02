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
import Configuracoes from './pages/Configuracoes';
import WizardBemVinda from './pages/WizardBemVinda';

import VendedorApp from './vendedor/VendedorApp';
import BannerOffline from './components/BannerOffline';

export default function App() {
  const [sessao, setSessao] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [salaoNome, setSalaoNome] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erroCritico, setErroCritico] = useState(null);

  // ─── Carregar perfil do Supabase (extraída para reutilização) ───
  const carregarPerfil = async (userId) => {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000);

      const { data, error } = await supabase
        .from('perfis_acesso')
        .select(`salao_id, cargo, saloes(configurado, nome)`)
        .eq('auth_user_id', userId)
        .abortSignal(controller.signal)
        .single();

      clearTimeout(id);

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
      console.error('Erro ao carregar perfil:', err);
      setErroCritico(err.message || 'Ocorreu um erro desconhecido.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    // 🛡️ Failsafe: Nunca travar na tela de loading por mais de 5 segundos
    const failsafeTimeout = setTimeout(() => {
      setCarregando(false);
    }, 5000);

    let perfilCarregadoLocalmente = false; // Flag para evitar chamadas duplas

    // ── Listener centralizado de sessão (Evita o erro de Lock roubado) ──
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        
        if (event === 'SIGNED_OUT' || !session) {
          setSessao(null);
          setPerfil(null);
          setSalaoNome('');
          setErroCritico(null);
          setCarregando(false);
          perfilCarregadoLocalmente = false;
          return;
        }

        setSessao(session);

        // Se tivermos sessão, mas ainda não buscamos o perfil
        if (!perfilCarregadoLocalmente) {
          perfilCarregadoLocalmente = true; // Trava imediata contra corrida
          await carregarPerfil(session.user.id);
        }
      }
    );

    return () => {
      clearTimeout(failsafeTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // Ecrã de Erro Crítico
  if (erroCritico) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="bg-white/[0.07] backdrop-blur-xl p-8 rounded-2xl shadow-2xl max-w-lg w-full border border-red-500/20">
          <div className="w-14 h-14 bg-red-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-red-400 text-2xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-red-400 mb-2 text-center">Erro de Acesso Detectado</h1>
          <p className="text-sm text-slate-400 mb-6 text-center">{erroCritico}</p>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }}
            className="w-full bg-gradient-to-r from-rose-500 to-amber-500 text-white px-4 py-3 rounded-xl text-sm font-bold hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg"
          >
            Sair e Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Carregando o sistema...</p>
        </div>
      </div>
    );
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
        <BannerOffline />
        <VendedorApp email={email} userId={sessao.user.id} />
      </BrowserRouter>
    );
  }

  // Wizard de primeiro acesso — tela cheia, sem sidebar
  if (role === 'PROPRIETARIO' && configurado === false) {
    return <><BannerOffline /><WizardBemVinda /></>;
  }

  return (
    <BrowserRouter>
      <BannerOffline />
      <ToastProvider>
        <div className="flex flex-col md:flex-row min-h-screen bg-gradient-to-br from-slate-50 to-rose-50/20 pb-[72px] md:pb-0">
          <Sidebar role={role} email={email} salaoNome={salaoNome} />
          <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto flex flex-col w-full relative">
            <div className="animate-fadeIn flex-1">
              <Routes>
                <Route path="/" element={<Navigate to="/agenda" />} />
                <Route path="/agenda" element={<Agenda {...ctx} />} />
                <Route path="/clientes" element={role === 'PROPRIETARIO' ? <Clientes {...ctx} /> : <Navigate to="/agenda" />} />
                <Route path="/dashboard" element={role === 'PROPRIETARIO' ? <Dashboard {...ctx} /> : <Navigate to="/agenda" />} />
                <Route path="/precificacao" element={role === 'PROPRIETARIO' ? <Precificacao {...ctx} /> : <Navigate to="/agenda" />} />
                <Route path="/homecar" element={role === 'PROPRIETARIO' ? <HomeCar {...ctx} /> : <Navigate to="/agenda" />} />
                <Route path="/paralelos" element={role === 'PROPRIETARIO' ? <Paralelos {...ctx} /> : <Navigate to="/agenda" />} />
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
