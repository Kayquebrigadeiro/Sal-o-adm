import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Hook para gerenciar a proteção inteligente do Dashboard Financeiro.
 * 
 * - Carrega configuração de proteção do banco (dashboard_protection_enabled + dashboard_pin)
 * - Escuta eventos de visibilidade (visibilitychange, blur/focus)
 * - Gerencia estado isLocked (apenas em memória — sem LocalStorage/SessionStorage)
 * - Quando proteção ativada: Dashboard abre bloqueado + bloqueia ao perder foco
 * - Quando desativada: Dashboard abre livre, sem bloqueio por foco
 */
export default function useDashboardProtection(salaoId) {
  const [protectionEnabled, setProtectionEnabled] = useState(false);
  const [pin, setPin] = useState(null);
  const [isLocked, setIsLocked] = useState(true); // começa bloqueado por segurança
  const [loading, setLoading] = useState(true);
  const wasUnlockedRef = useRef(false); // rastreia se o dashboard já foi desbloqueado nesta sessão

  // ─── Carregar configuração do banco ───
  const fetchConfig = useCallback(async () => {
    if (!salaoId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('dashboard_protection_enabled, dashboard_pin')
        .eq('salao_id', salaoId)
        .maybeSingle();

      if (error) throw error;

      const enabled = data?.dashboard_protection_enabled ?? false;
      const dbPin = data?.dashboard_pin ?? null;

      setProtectionEnabled(enabled);
      setPin(dbPin);

      // Se proteção desativada, desbloqueia direto
      if (!enabled) {
        setIsLocked(false);
        wasUnlockedRef.current = true;
      } else {
        // Proteção ativada: começa bloqueado
        setIsLocked(true);
        wasUnlockedRef.current = false;
      }
    } catch (err) {
      console.error('Erro ao carregar proteção do Dashboard:', err);
      // Em caso de erro, desbloqueia para não travar o acesso
      setIsLocked(false);
      wasUnlockedRef.current = true;
    } finally {
      setLoading(false);
    }
  }, [salaoId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // ─── Escutar perda de foco ───
  useEffect(() => {
    if (!protectionEnabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && wasUnlockedRef.current) {
        setIsLocked(true);
        wasUnlockedRef.current = false;
      }
    };

    const handleBlur = () => {
      if (wasUnlockedRef.current) {
        setIsLocked(true);
        wasUnlockedRef.current = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [protectionEnabled]);

  // ─── Desbloquear com PIN ───
  const unlock = useCallback((inputPin) => {
    if (inputPin === pin) {
      setIsLocked(false);
      wasUnlockedRef.current = true;
      return true;
    }
    return false;
  }, [pin]);

  return {
    isLocked,
    setIsLocked,
    protectionEnabled,
    pin,
    loading,
    unlock,
    refetch: fetchConfig,
  };
}
