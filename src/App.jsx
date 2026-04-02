import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Login from './Login';
import Agenda from './Agenda';

export default function App() {
  const [sessao, setSessao] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    // Verifica se já tem sessão ativa ao abrir o app
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      setCarregando(false);
    });

    // Escuta mudanças de login/logout em tempo real
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessao(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Carregando...</p>
      </div>
    );
  }

  // Se não tem sessão → tela de login
  // Se tem sessão → agenda
  return sessao ? <Agenda sessao={sessao} /> : <Login />;
}
