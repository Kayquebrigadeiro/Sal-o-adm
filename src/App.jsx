import { useEffect, useState, useRef } from 'react';
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

import VendedorApp from './vendedor/VendedorApp';
import BannerOffline from './components/BannerOffline';
// DESATIVADO TEMPORARIAMENTE
// import TelaAssinaturaVencida from './pages/TelaAssinaturaVencida';
// import BannerRenovacao from './components/BannerRenovacao';

export default function App() {
  const [sessao, setSessao] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [salaoNome, setSalaoNome] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erroCritico, setErroCritico] = useState(null);
  const [assinatura, setAssinatura] = useState(null);

  // 🛡️ useRef para evitar race conditions entre initSession e onAuthStateChange
  const perfilBuscadoRef = useRef(false);
  const mountedRef = useRef(true);

  // ─── Carregar perfil do Supabase (extraída para reutilização) ───
  const carregarPerfil = async (userId) => {
    try {
      // Promise.race envolve TODO o carregarPerfil
      const resultado = await Promise.race([
        supabase
          .from('perfis_acesso')
          .select(`salao_id, cargo, saloes(configurado, nome)`)
          .eq('auth_user_id', userId)
          .single(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT_PERFIL')), 8000)
        )
      ]);

      if (!mountedRef.current) return;
      const { data, error } = resultado;

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

        // DESATIVADO TEMPORARIAMENTE
        // if (data.cargo === 'PROPRIETARIO' && data.salao_id) {
        //   const { data: acesso, error: acessoErr } = await supabase
        //     .rpc('verificar_acesso_salao', { p_salao_id: data.salao_id });
        //   if (!acessoErr && acesso) {
        //     setAssinatura(acesso);
        //   }
        // }
      } else {
        setErroCritico('Perfil não encontrado na tabela perfis_acesso.');
      }
    } catch (err) {
      if (!mountedRef.current) return;

      console.error('Erro ao carregar perfil:', err.message);

      if (err.message === 'TIMEOUT_PERFIL') {
        setErroCritico('O servidor demorou muito para responder. Verifique sua conexão e tente novamente.');
      } else {
        setErroCritico(err.message || 'Ocorreu um erro desconhecido.');
      }
    } finally {
      if (mountedRef.current) setCarregando(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    perfilBuscadoRef.current = false;
    const initSession = async () => {
      try {
        // Promise race to prevent Supabase getSession deadlock
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_GET_SESSION')), 5000));
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (!mountedRef.current) return;

        if (session) {
          setSessao(session);
          if (!perfilBuscadoRef.current) {
            perfilBuscadoRef.current = true;
            await carregarPerfil(session.user.id);
          }
        } else {
          setSessao(null);
          setPerfil(null);
          setCarregando(false);
        }
      } catch (err) {
        console.error("Erro ao buscar sessão (timeout ou falha):", err);
        // Se a requisição de recuperar sessão for muito lenta, não queremos apagar o login do usuário, 
        // vamos mostrar um erro que instrui a atualizar a página.
        if (mountedRef.current) {
          if (err.message === 'TIMEOUT_GET_SESSION') {
             setErroCritico('Sua conexão parece instável e não foi possível carregar a sessão a tempo. Por favor, recarregue a página.');
          }
          setCarregando(false);
        }
      }
    };

    initSession();

    // ── Listener centralizado de sessão ──
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;

        if (event === 'SIGNED_OUT') {
          setSessao(null);
          setPerfil(null);
          setSalaoNome('');
          setErroCritico(null);
          setAssinatura(null);
          setCarregando(false);
          perfilBuscadoRef.current = false;
          return;
        }

        if (!session) {
           setSessao(null);
           setPerfil(null);
           setCarregando(false);
           return;
        }

        setSessao(session);

        // Se a sessão mudou/atualizou e ainda não temos o perfil carregado
        if (session && !perfilBuscadoRef.current) {
          perfilBuscadoRef.current = true;
          setCarregando(true);
          await carregarPerfil(session.user.id);
        }
      }
    );

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  // Ecrã de Erro Crítico
  if (erroCritico) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-sky-50 to-white p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full border border-red-200">
          <div className="w-14 h-14 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-2xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-red-600 mb-2 text-center">Erro de Acesso Detectado</h1>
          <p className="text-sm text-gray-500 mb-6 text-center">{erroCritico}</p>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }}
            className="w-full bg-sky-500 text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-sky-600 transition-all shadow-lg"
          >
            Sair e Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm font-medium">Carregando o sistema...</p>
        </div>
      </div>
    );
  }

  if (!sessao || !perfil) {
    return <Login />;
  }

  const salaoId = perfil?.salao_id;
  const role = perfil?.cargo;
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

  // Se proprietária com assinatura vencida → tela de bloqueio
  // DESATIVADO TEMPORARIAMENTE
  /*
  if (role === 'PROPRIETARIO' && assinatura && !assinatura.tem_acesso) {
    return (
      <BrowserRouter>
        <ToastProvider>
          <TelaAssinaturaVencida
            salaoNome={salaoNome}
            dataVencimento={assinatura.data_vencimento}
            diasRestantes={assinatura.dias_restantes}
            valorPlano={assinatura.valor_plano}
          />
        </ToastProvider>
      </BrowserRouter>
    );
  }
  */

  return (
    <BrowserRouter>
      <BannerOffline />
      {/* DESATIVADO TEMPORARIAMENTE
      {role === 'PROPRIETARIO' && assinatura && assinatura.tem_acesso && (
        <BannerRenovacao diasRestantes={assinatura.dias_restantes} />
      )}
      */}
      <ToastProvider>
        <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 pb-[72px] md:pb-0">
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
