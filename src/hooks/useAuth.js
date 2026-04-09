import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export function useAuth() {
  const [sessao, setSessao] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessao(session);
      if (session) carregarPerfil(session.user.id);
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSessao(session);
        if (session) carregarPerfil(session.user.id);
        else {
          setPerfil(null);
          setLoading(false);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  async function carregarPerfil(userId) {
    // Fazemos um "Join" para pegar o status configurado da tabela de salões
    const { data, error } = await supabase
      .from('perfis_acesso')
      .select(`
        salao_id, 
        cargo,
        saloes ( configurado )
      `)
      .eq('auth_user_id', userId)
      .single();

    if (data) {
      setPerfil({
        salao_id: data.salao_id,
        cargo: data.cargo,
        configurado: data.saloes?.configurado // Extrai o booleano aqui
      });
    } else {
      console.error('Erro ao buscar perfil:', error);
    }
    
    setLoading(false);
  }

  return {
    sessao,
    perfil,
    loading
  };
}
